# WedSync Rate Limiting API Reference

## 📚 Table of Contents
- [Overview](#overview)
- [Authentication](#authentication)
- [Rate Limit Headers](#rate-limit-headers)
- [API Endpoints](#api-endpoints)
- [Error Handling](#error-handling)
- [Code Examples](#code-examples)
- [Wedding Industry Use Cases](#wedding-industry-use-cases)
- [SDK Libraries](#sdk-libraries)
- [Testing & Development](#testing--development)

## Overview

The WedSync Rate Limiting API provides programmatic access to rate limiting information, configuration, and monitoring. This API is designed for:

- **Internal applications** building WedSync features
- **Third-party integrations** connecting to WedSync
- **Monitoring tools** tracking rate limiting performance
- **Custom dashboards** displaying usage metrics

**Base URL:** `https://api.wedsync.com/v1`  
**Rate Limiting:** This API itself is rate limited per your subscription tier  
**Response Format:** JSON  
**Authentication:** API Key or OAuth 2.0

## Authentication

### API Key Authentication
```bash
# Include API key in header
curl -H "Authorization: Bearer ws_live_1234567890abcdef" \
     -H "Content-Type: application/json" \
     https://api.wedsync.com/v1/rate-limits/status
```

### OAuth 2.0 (SCALE+ Tiers)
```javascript
const axios = require('axios');

const response = await axios.get('https://api.wedsync.com/v1/rate-limits/status', {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  }
});
```

### Organization Context
Some endpoints require organization ID for multi-tenant access:
```bash
curl -H "Authorization: Bearer ws_live_1234567890abcdef" \
     -H "X-Organization-ID: org_wedding_studio_123" \
     https://api.wedsync.com/v1/rate-limits/organization/usage
```

## Rate Limit Headers

All API responses include rate limiting information in headers:

```http
HTTP/1.1 200 OK
X-RateLimit-Limit: 1000          # Requests per window
X-RateLimit-Remaining: 847        # Remaining requests
X-RateLimit-Reset: 1640995200     # Unix timestamp when window resets
X-RateLimit-Window: 3600          # Window size in seconds
X-RateLimit-Tier: PROFESSIONAL    # Subscription tier
X-RateLimit-Wedding-Season: true  # Wedding season boost active
X-RateLimit-Retry-After: 60       # Only present when rate limited
```

### Wedding Industry Specific Headers
```http
X-RateLimit-Vendor-Type: photographer     # Vendor-specific limits
X-RateLimit-Saturday-Boost: active        # Weekend boost status
X-RateLimit-Upload-Allowance: 1073741824  # Upload limit in bytes
X-RateLimit-Burst-Available: 150          # Burst capacity remaining
```

## API Endpoints

### 1. Rate Limit Status

**Get current rate limit status**

```http
GET /v1/rate-limits/status
```

**Response:**
```json
{
  "status": "ok",
  "limits": {
    "requests_per_minute": 120,
    "burst_allowance": 180,
    "upload_limit_mb": 1024,
    "api_calls_per_hour": 2000
  },
  "usage": {
    "requests_current_minute": 23,
    "burst_used": 0,
    "api_calls_current_hour": 145
  },
  "tier": "PROFESSIONAL",
  "vendor_type": "photographer",
  "modifiers": {
    "wedding_season_active": true,
    "saturday_boost": false,
    "weekend_multiplier": 1.0
  },
  "next_reset": "2025-01-15T10:45:00Z"
}
```

### 2. Organization Usage

**Get detailed usage statistics for organization**

```http
GET /v1/rate-limits/organization/usage
```

**Query Parameters:**
- `period` (optional): `hour`, `day`, `week`, `month` (default: `hour`)
- `vendor_type` (optional): Filter by vendor type
- `start_date` (optional): ISO 8601 date string
- `end_date` (optional): ISO 8601 date string

**Response:**
```json
{
  "organization": {
    "id": "org_wedding_studio_123",
    "name": "Perfect Day Photography",
    "tier": "PROFESSIONAL"
  },
  "period": "day",
  "usage": {
    "total_requests": 8543,
    "successful_requests": 8521,
    "rate_limited_requests": 22,
    "average_response_time_ms": 3.2,
    "peak_requests_per_minute": 145,
    "upload_volume_gb": 12.3
  },
  "breakdown_by_endpoint": {
    "/api/galleries/upload": {
      "requests": 1234,
      "avg_response_time_ms": 45.2,
      "rate_limited": 5
    },
    "/api/clients/update": {
      "requests": 2341,
      "avg_response_time_ms": 2.1,
      "rate_limited": 0
    }
  },
  "peak_periods": [
    {
      "time": "2025-01-15T09:00:00Z",
      "requests_per_minute": 145,
      "context": "Monday morning venue updates"
    }
  ]
}
```

### 3. Historical Analytics

**Get rate limiting analytics over time**

```http
GET /v1/rate-limits/analytics
```

**Query Parameters:**
- `timeframe` (required): `1h`, `24h`, `7d`, `30d`
- `granularity` (optional): `minute`, `hour`, `day` (auto-selected)
- `include_wedding_context` (optional): `true` for wedding industry insights

**Response:**
```json
{
  "timeframe": "7d",
  "granularity": "hour",
  "data_points": [
    {
      "timestamp": "2025-01-15T09:00:00Z",
      "requests": 8543,
      "rate_limited": 22,
      "avg_response_time_ms": 3.2,
      "wedding_context": {
        "day_of_week": "Monday",
        "wedding_season": true,
        "typical_activity": "venue_booking_updates"
      }
    }
  ],
  "summary": {
    "total_requests": 167543,
    "success_rate": 99.7,
    "avg_response_time_ms": 3.1,
    "peak_hour": "2025-01-12T21:00:00Z",
    "peak_requests": 12543
  },
  "wedding_insights": {
    "busiest_day_type": "Sunday evening",
    "seasonal_multiplier_active": true,
    "vendor_type_breakdown": {
      "photographer": 45,
      "venue": 25,
      "planner": 20,
      "other": 10
    }
  }
}
```

### 4. Rate Limit Configuration (Admin Only)

**Update rate limiting configuration**

```http
POST /v1/rate-limits/config/update
```

**Request Body:**
```json
{
  "organization_id": "org_wedding_studio_123",
  "temporary_adjustments": {
    "multiplier": 1.5,
    "duration_hours": 4,
    "reason": "Peak wedding gallery uploads",
    "auto_revert": true
  },
  "vendor_specific_limits": {
    "photographer": {
      "requests_per_minute": 150,
      "upload_limit_mb": 1500
    }
  },
  "emergency_mode": false
}
```

**Response:**
```json
{
  "status": "updated",
  "changes": {
    "applied_at": "2025-01-15T10:30:00Z",
    "expires_at": "2025-01-15T14:30:00Z",
    "previous_limits": {
      "requests_per_minute": 120
    },
    "new_limits": {
      "requests_per_minute": 180
    }
  },
  "audit_log_id": "audit_12345"
}
```

### 5. Rate Limit Test

**Test rate limiting behavior (Development only)**

```http
POST /v1/rate-limits/test
```

**Request Body:**
```json
{
  "simulate": {
    "requests_per_minute": 200,
    "duration_seconds": 60,
    "vendor_type": "photographer",
    "scenario": "sunday_evening_upload_surge"
  }
}
```

**Response:**
```json
{
  "test_results": {
    "total_requests": 200,
    "successful_requests": 180,
    "rate_limited_requests": 20,
    "avg_response_time_ms": 4.2,
    "max_response_time_ms": 15.1,
    "rate_limit_triggered_at_request": 181
  },
  "recommendations": {
    "suggested_tier": "SCALE",
    "optimization_tips": [
      "Consider batch uploading during off-peak hours",
      "Use progressive upload for large galleries"
    ]
  }
}
```

## Error Handling

### HTTP Status Codes

| Code | Status | Description |
|------|--------|-------------|
| 200 | OK | Request successful |
| 400 | Bad Request | Invalid request parameters |
| 401 | Unauthorized | Invalid or missing authentication |
| 403 | Forbidden | Insufficient permissions |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |
| 503 | Service Unavailable | Temporary service issue |

### Rate Limit Exceeded Response

```http
HTTP/1.1 429 Too Many Requests
X-RateLimit-Retry-After: 60
Content-Type: application/json

{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Please try again in 60 seconds.",
    "details": {
      "limit": 120,
      "window_seconds": 60,
      "reset_time": "2025-01-15T10:46:00Z",
      "wedding_context": {
        "suggestion": "Sunday evenings are busy with gallery uploads. Consider uploading earlier in the day.",
        "alternative": "Use batch upload API for better efficiency"
      }
    }
  }
}
```

### Wedding Industry Error Context

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Wedding season traffic surge detected",
    "wedding_context": {
      "busy_period": "saturday_morning_prep",
      "estimated_wait_seconds": 90,
      "alternatives": [
        "Use priority wedding day API endpoints",
        "Consider upgrading to SCALE tier for peak season",
        "Implement request queuing in your application"
      ],
      "peak_info": {
        "current_load": "very_high",
        "typical_for": "Saturday mornings during wedding season",
        "expected_duration": "2-3 hours"
      }
    }
  }
}
```

## Code Examples

### JavaScript/Node.js

**Basic Rate Limit Check:**
```javascript
const axios = require('axios');

class WedSyncRateLimit {
  constructor(apiKey, orgId = null) {
    this.apiKey = apiKey;
    this.orgId = orgId;
    this.baseURL = 'https://api.wedsync.com/v1';
  }

  async checkRateLimit() {
    try {
      const headers = {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      };
      
      if (this.orgId) {
        headers['X-Organization-ID'] = this.orgId;
      }

      const response = await axios.get(`${this.baseURL}/rate-limits/status`, {
        headers
      });

      return {
        canMakeRequest: response.data.usage.requests_current_minute < response.data.limits.requests_per_minute,
        remainingRequests: response.data.limits.requests_per_minute - response.data.usage.requests_current_minute,
        resetTime: response.data.next_reset,
        weddingSeasonActive: response.data.modifiers.wedding_season_active
      };
    } catch (error) {
      if (error.response?.status === 429) {
        return {
          canMakeRequest: false,
          retryAfter: parseInt(error.response.headers['x-ratelimit-retry-after']),
          weddingContext: error.response.data.error.wedding_context
        };
      }
      throw error;
    }
  }

  async getUsageAnalytics(timeframe = '24h') {
    const response = await axios.get(`${this.baseURL}/rate-limits/analytics`, {
      params: { timeframe, include_wedding_context: true },
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'X-Organization-ID': this.orgId
      }
    });
    
    return response.data;
  }
}

// Usage example for wedding photographer
const rateLimiter = new WedSyncRateLimit('ws_live_abc123', 'org_perfect_day_photo');

async function uploadWeddingGallery(photos) {
  const status = await rateLimiter.checkRateLimit();
  
  if (!status.canMakeRequest) {
    console.log(`Rate limit exceeded. Wait ${status.retryAfter} seconds.`);
    if (status.weddingContext) {
      console.log(`Wedding context: ${status.weddingContext.suggestion}`);
    }
    return;
  }
  
  console.log(`Can make ${status.remainingRequests} more requests`);
  if (status.weddingSeasonActive) {
    console.log('Wedding season boost is active - higher limits available');
  }
  
  // Proceed with upload...
}
```

### Python

**Rate Limiting with Retry Logic:**
```python
import requests
import time
from datetime import datetime, timedelta

class WedSyncRateLimiter:
    def __init__(self, api_key, org_id=None):
        self.api_key = api_key
        self.org_id = org_id
        self.base_url = 'https://api.wedsync.com/v1'
        
    def _get_headers(self):
        headers = {
            'Authorization': f'Bearer {self.api_key}',
            'Content-Type': 'application/json'
        }
        if self.org_id:
            headers['X-Organization-ID'] = self.org_id
        return headers
    
    def check_rate_limit(self):
        response = requests.get(
            f'{self.base_url}/rate-limits/status',
            headers=self._get_headers()
        )
        
        if response.status_code == 429:
            retry_after = int(response.headers.get('X-RateLimit-Retry-After', 60))
            wedding_context = response.json().get('error', {}).get('wedding_context', {})
            return {
                'can_proceed': False,
                'retry_after': retry_after,
                'wedding_suggestion': wedding_context.get('suggestion'),
                'peak_info': wedding_context.get('peak_info')
            }
        
        data = response.json()
        remaining = data['limits']['requests_per_minute'] - data['usage']['requests_current_minute']
        
        return {
            'can_proceed': remaining > 0,
            'remaining_requests': remaining,
            'wedding_season_boost': data['modifiers']['wedding_season_active'],
            'saturday_boost': data['modifiers']['saturday_boost']
        }
    
    def make_request_with_retry(self, method, endpoint, **kwargs):
        """Make API request with automatic retry logic for rate limits"""
        max_retries = 3
        retry_count = 0
        
        while retry_count < max_retries:
            try:
                response = requests.request(
                    method, 
                    f'{self.base_url}{endpoint}',
                    headers=self._get_headers(),
                    **kwargs
                )
                
                if response.status_code != 429:
                    return response
                
                # Rate limited - check context and retry
                retry_after = int(response.headers.get('X-RateLimit-Retry-After', 60))
                error_data = response.json().get('error', {})
                wedding_context = error_data.get('wedding_context', {})
                
                print(f"Rate limited. Waiting {retry_after} seconds...")
                if wedding_context.get('suggestion'):
                    print(f"Wedding tip: {wedding_context['suggestion']}")
                
                time.sleep(retry_after)
                retry_count += 1
                
            except requests.exceptions.RequestException as e:
                print(f"Request failed: {e}")
                retry_count += 1
                time.sleep(2 ** retry_count)  # Exponential backoff
        
        raise Exception(f"Max retries ({max_retries}) exceeded")

# Usage for venue management
rate_limiter = WedSyncRateLimiter('ws_live_xyz789', 'org_grand_ballroom')

def update_venue_availability(dates):
    """Update multiple availability dates with rate limiting"""
    for date in dates:
        status = rate_limiter.check_rate_limit()
        
        if not status['can_proceed']:
            if status.get('wedding_suggestion'):
                print(f"Wedding industry tip: {status['wedding_suggestion']}")
            time.sleep(status.get('retry_after', 60))
        
        # Make the availability update request
        response = rate_limiter.make_request_with_retry(
            'POST', 
            '/api/venue/availability',
            json={'date': date, 'available': True}
        )
        
        print(f"Updated {date}: {response.status_code}")
```

### PHP

**Wedding Planner Bulk Operations:**
```php
<?php
class WedSyncRateLimiter {
    private $apiKey;
    private $orgId;
    private $baseUrl = 'https://api.wedsync.com/v1';
    
    public function __construct($apiKey, $orgId = null) {
        $this->apiKey = $apiKey;
        $this->orgId = $orgId;
    }
    
    private function getHeaders() {
        $headers = [
            'Authorization: Bearer ' . $this->apiKey,
            'Content-Type: application/json'
        ];
        
        if ($this->orgId) {
            $headers[] = 'X-Organization-ID: ' . $this->orgId;
        }
        
        return $headers;
    }
    
    public function checkRateLimit() {
        $curl = curl_init();
        curl_setopt_array($curl, [
            CURLOPT_URL => $this->baseUrl . '/rate-limits/status',
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => $this->getHeaders(),
        ]);
        
        $response = curl_exec($curl);
        $httpCode = curl_getinfo($curl, CURLINFO_HTTP_CODE);
        curl_close($curl);
        
        $data = json_decode($response, true);
        
        if ($httpCode === 429) {
            return [
                'can_proceed' => false,
                'retry_after' => $data['error']['details']['reset_time'] ?? 60,
                'wedding_context' => $data['error']['wedding_context'] ?? null
            ];
        }
        
        $remaining = $data['limits']['requests_per_minute'] - $data['usage']['requests_current_minute'];
        
        return [
            'can_proceed' => $remaining > 0,
            'remaining_requests' => $remaining,
            'wedding_season_boost' => $data['modifiers']['wedding_season_active'],
            'vendor_type' => $data['vendor_type']
        ];
    }
    
    public function bulkVendorNotification($vendors, $message) {
        // Wedding planner sending updates to all vendors
        $batchSize = 10; // Process in smaller batches to respect rate limits
        $batches = array_chunk($vendors, $batchSize);
        
        foreach ($batches as $batch) {
            $status = $this->checkRateLimit();
            
            if (!$status['can_proceed']) {
                echo "Rate limit reached. ";
                if (isset($status['wedding_context']['suggestion'])) {
                    echo "Wedding tip: " . $status['wedding_context']['suggestion'];
                }
                sleep($status['retry_after']);
            }
            
            // Process batch
            $this->sendBatchNotification($batch, $message);
            
            // Brief pause between batches for courtesy
            usleep(100000); // 100ms
        }
    }
    
    private function sendBatchNotification($vendors, $message) {
        // Implementation for batch notification
        // This would call the actual WedSync notification API
    }
}

// Usage for wedding planner
$rateLimiter = new WedSyncRateLimiter('ws_live_planner123', 'org_dream_weddings');

$allVendors = [
    'photographer_id_1',
    'venue_id_2',
    'florist_id_3',
    // ... more vendors
];

$message = "Timeline update: Ceremony moved to 4 PM due to weather forecast.";
$rateLimiter->bulkVendorNotification($allVendors, $message);
?>
```

## Wedding Industry Use Cases

### 1. Wedding Gallery Upload Optimization

**Scenario:** Photography studio needs to upload multiple wedding galleries on Sunday nights.

```javascript
// Smart gallery upload with wedding season awareness
async function uploadWeddingGalleryIntelligent(weddingId, photos) {
  const rateLimiter = new WedSyncRateLimiter(API_KEY, ORG_ID);
  
  // Check current conditions
  const status = await rateLimiter.checkRateLimit();
  
  if (status.weddingSeasonActive) {
    console.log('Wedding season boost active - using optimized upload strategy');
    return await uploadWithSeasonalOptimization(photos);
  }
  
  // Check if it's Sunday evening (peak upload time)
  const now = new Date();
  const isSundayEvening = now.getDay() === 0 && now.getHours() >= 18;
  
  if (isSundayEvening && !status.canMakeRequest) {
    // Use queue-based upload during peak times
    return await queueGalleryUpload(weddingId, photos);
  }
  
  return await uploadGalleryDirect(photos);
}
```

### 2. Venue Multi-Location Management

**Scenario:** Venue chain needs to synchronize availability across multiple locations.

```python
def sync_multi_venue_availability(venues, date_range):
    rate_limiter = WedSyncRateLimiter(API_KEY)
    
    # Check if we have SCALE+ tier for multi-location support
    status = rate_limiter.check_rate_limit()
    
    if status.get('tier') in ['SCALE', 'ENTERPRISE']:
        # Can handle concurrent venue updates
        return sync_venues_concurrent(venues, date_range)
    else:
        # Sequential updates with rate limiting
        return sync_venues_sequential(venues, date_range, rate_limiter)

def sync_venues_concurrent(venues, date_range):
    # Implementation for high-tier concurrent processing
    pass

def sync_venues_sequential(venues, date_range, rate_limiter):
    results = []
    
    for venue in venues:
        # Check rate limits before each venue
        status = rate_limiter.check_rate_limit()
        
        if not status['can_proceed']:
            print(f"Rate limited. Waiting {status.get('retry_after', 60)} seconds...")
            time.sleep(status.get('retry_after', 60))
        
        # Update venue availability
        result = update_venue_availability(venue, date_range)
        results.append(result)
        
        # Brief pause between venues
        time.sleep(1)
    
    return results
```

### 3. Wedding Planner Final Month Coordination

**Scenario:** Wedding planner needs to coordinate with 15+ vendors in final month before wedding.

```javascript
class WeddingCoordinator {
  constructor(apiKey, orgId) {
    this.rateLimiter = new WedSyncRateLimiter(apiKey, orgId);
    this.priorityEndpoints = [
      '/api/timeline/update',
      '/api/vendor/urgent-message',
      '/api/emergency/notification'
    ];
  }
  
  async coordinateFinalMonth(weddingId, vendors, updates) {
    // Get current rate limiting status
    const status = await this.rateLimiter.checkRateLimit();
    
    // Determine strategy based on tier and current usage
    const strategy = this.determineCoordinationStrategy(status, vendors.length);
    
    switch (strategy) {
      case 'BATCH_PROCESS':
        return await this.batchProcessUpdates(vendors, updates);
      case 'PRIORITY_QUEUE':
        return await this.priorityQueueUpdates(vendors, updates);
      case 'IMMEDIATE_PROCESS':
        return await this.immediateProcessUpdates(vendors, updates);
    }
  }
  
  determineCoordinationStrategy(status, vendorCount) {
    if (status.tier === 'ENTERPRISE' && vendorCount > 20) {
      return 'IMMEDIATE_PROCESS';
    }
    
    if (status.weddingSeasonActive && vendorCount > 10) {
      return 'PRIORITY_QUEUE';
    }
    
    return 'BATCH_PROCESS';
  }
  
  async batchProcessUpdates(vendors, updates) {
    // Group vendors and process in batches to respect rate limits
    const batchSize = this.calculateOptimalBatchSize();
    // Implementation...
  }
}
```

## SDK Libraries

### Official WedSync SDK

**Installation:**
```bash
npm install @wedsync/sdk-js          # JavaScript/Node.js
pip install wedsync-python-sdk       # Python
composer require wedsync/php-sdk     # PHP
```

**Quick Setup:**
```javascript
import WedSync from '@wedsync/sdk-js';

const client = new WedSync({
  apiKey: 'ws_live_your_key_here',
  organizationId: 'org_your_org_id',
  rateLimiting: {
    autoRetry: true,
    respectWeddingContext: true,
    maxRetries: 3
  }
});

// Rate limiting is handled automatically
const result = await client.galleries.upload(photos);
```

### Community Libraries

**Ruby Gem:**
```ruby
gem 'wedsync-ruby'

require 'wedsync'

WedSync.configure do |config|
  config.api_key = 'ws_live_your_key_here'
  config.auto_retry_on_rate_limit = true
end
```

## Testing & Development

### Development Environment

**Test API Base URL:** `https://api-test.wedsync.com/v1`

**Test Rate Limiting:**
- More permissive limits for development
- Sandbox mode simulates wedding season traffic
- Test scenarios for different vendor types

### Rate Limit Testing

```bash
# Test rate limiting behavior
curl -X POST https://api-test.wedsync.com/v1/rate-limits/test \
  -H "Authorization: Bearer ws_test_key" \
  -d '{
    "simulate": {
      "scenario": "photographer_sunday_uploads",
      "requests_per_minute": 200,
      "duration_seconds": 300
    }
  }'
```

### Webhook Testing

**Rate Limit Event Webhooks:**
```json
{
  "event": "rate_limit.threshold_reached",
  "data": {
    "organization_id": "org_test_123",
    "threshold": 0.8,
    "current_usage": 96,
    "limit": 120,
    "vendor_type": "photographer",
    "wedding_context": {
      "period": "sunday_evening",
      "suggested_action": "consider_batch_upload"
    }
  }
}
```

### Performance Testing

```javascript
// Load testing script for wedding season simulation
const loadTest = require('@wedsync/load-test');

await loadTest.simulate({
  scenario: 'wedding_season_peak',
  concurrent_users: 500,
  vendor_distribution: {
    photographer: 40,
    venue: 25,
    planner: 20,
    other: 15
  },
  duration_minutes: 60,
  ramp_up_time: 300
});
```

## Best Practices

### 1. Implement Exponential Backoff
```javascript
async function makeRequestWithBackoff(requestFn, maxRetries = 3) {
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      return await requestFn();
    } catch (error) {
      if (error.status === 429) {
        const waitTime = Math.pow(2, retries) * 1000; // Exponential backoff
        console.log(`Rate limited. Waiting ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        retries++;
      } else {
        throw error;
      }
    }
  }
  
  throw new Error('Max retries exceeded');
}
```

### 2. Batch Operations
```javascript
// Batch multiple operations together
async function batchVendorUpdates(updates) {
  const batchSize = 10;
  const batches = chunkArray(updates, batchSize);
  
  for (const batch of batches) {
    await processBatch(batch);
    // Brief pause between batches
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}
```

### 3. Monitor and Alert
```javascript
// Set up monitoring for rate limit usage
async function monitorRateUsage() {
  const status = await rateLimiter.checkRateLimit();
  
  if (status.usage_percentage > 80) {
    await sendAlert({
      level: 'warning',
      message: 'Rate limit usage high',
      context: status.wedding_context
    });
  }
}
```

## Support & Resources

### Developer Support
- **Documentation:** https://docs.wedsync.com/api
- **Status Page:** https://status.wedsync.com
- **Developer Forum:** https://community.wedsync.com/developers

### Rate Limiting Specific Support
- **Email:** api-support@wedsync.com
- **Slack:** #api-developers in WedSync Community
- **Office Hours:** Tuesdays 2-3 PM GMT

### Emergency Contact
- **Wedding Day API Issues:** +44 7700 900199
- **Critical Rate Limiting Problems:** emergency@wedsync.com

---

**API Version:** v1  
**Last Updated:** January 2025  
**Rate Limiting API Version:** 2.1  
**SDL Compatibility:** OpenAPI 3.0