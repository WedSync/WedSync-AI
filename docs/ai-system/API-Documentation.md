# WedSync Dual AI System - API Documentation

## Overview

The WedSync Dual AI System provides intelligent wedding planning automation through a hybrid architecture combining platform-managed AI services with client-owned AI providers. This documentation covers all API endpoints, authentication, and integration patterns.

## Architecture Overview

```
┌─────────────────────┐    ┌─────────────────────┐
│   Platform AI       │    │    Client AI        │
│   (WedSync Managed) │    │  (Supplier Owned)   │
├─────────────────────┤    ├─────────────────────┤
│ • OpenAI GPT-4      │    │ • Supplier's OpenAI │
│ • Anthropic Claude  │    │ • Anthropic Claude  │
│ • Cost Optimization │    │ • Direct Billing    │
│ • Rate Limiting     │    │ • Full Control      │
│ • Shared Quotas     │    │ • Premium Features  │
└─────────────────────┘    └─────────────────────┘
           │                           │
           └─────────┬─────────────────┘
                     │
          ┌─────────────────────┐
          │   Dual AI Router    │
          │  (Intelligent      │
          │   Request Routing) │
          └─────────────────────┘
```

## Authentication

### API Key Authentication

All API requests require authentication via API key in the header:

```http
Authorization: Bearer ws_api_key_your_organization_key_here
Content-Type: application/json
```

### Client AI Configuration

For suppliers using their own AI providers:

```http
X-Client-AI-Provider: openai|anthropic
X-Client-AI-Key: encrypted_client_api_key
X-Prefer-Client-AI: true|false
```

## Core API Endpoints

### 1. AI Processing Request

**Endpoint:** `POST /api/ai/process`

**Description:** Main endpoint for all AI processing requests. The system intelligently routes to platform or client AI based on availability, quotas, and preferences.

**Request:**
```json
{
  "type": "photo-batch-processing|menu-optimization|venue-planning",
  "data": {
    "supplierId": "string",
    "weddingId": "string",
    "processingData": {},
    "urgency": "low|standard|high|critical"
  },
  "preferences": {
    "preferredProvider": "platform|client|auto",
    "maxCost": 5.00,
    "maxResponseTime": 30000
  }
}
```

**Response:**
```json
{
  "success": true,
  "requestId": "req_123456789",
  "routingDecision": {
    "selectedProvider": "platform|client",
    "reason": "quota_available|cost_optimization|client_preference",
    "estimatedCost": 0.45,
    "estimatedTime": 1200
  },
  "result": {
    "processed": true,
    "data": {},
    "processingTime": 1156,
    "actualCost": 0.43
  },
  "metadata": {
    "modelUsed": "gpt-4|claude-3",
    "provider": "openai|anthropic",
    "tokens": {
      "input": 150,
      "output": 300
    }
  }
}
```

### 2. Migration Management

**Endpoint:** `POST /api/ai/migrate`

**Description:** Migrate between platform and client AI, or setup new client AI configuration.

**Migration Types:**
- `platform-to-client`: Setup client AI for premium features
- `client-to-platform`: Fallback to platform AI due to quotas/issues
- `client-setup`: Initial client AI configuration

**Request:**
```json
{
  "migrationType": "platform-to-client|client-to-platform|client-setup",
  "reason": "quota_limit|cost_optimization|premium_features|technical_issue",
  "clientConfig": {
    "provider": "openai|anthropic",
    "encryptedApiKey": "string",
    "preferences": {
      "models": ["gpt-4", "gpt-3.5-turbo"],
      "maxDailyCost": 50.00,
      "priority": "cost|speed|quality"
    }
  },
  "migrationSchedule": "immediate|next_billing|custom_date"
}
```

**Response:**
```json
{
  "success": true,
  "migrationId": "mig_123456789",
  "status": "pending|in_progress|completed|failed",
  "timeline": {
    "initiated": "2024-01-15T10:30:00Z",
    "estimatedCompletion": "2024-01-15T10:35:00Z",
    "actualCompletion": "2024-01-15T10:34:27Z"
  },
  "preValidation": {
    "apiKeyValid": true,
    "quotaAvailable": true,
    "backupRouteConfigured": true
  },
  "costImpact": {
    "estimatedMonthlySavings": 150.00,
    "setupFee": 0.00,
    "breakEvenDate": "2024-01-20T00:00:00Z"
  }
}
```

### 3. Usage and Billing Analytics

**Endpoint:** `GET /api/ai/analytics/usage`

**Description:** Comprehensive usage analytics for both platform and client AI consumption.

**Query Parameters:**
- `period`: `day|week|month|quarter|year`
- `startDate`: ISO 8601 date
- `endDate`: ISO 8601 date
- `provider`: `platform|client|all`
- `breakdown`: `by_feature|by_date|by_cost|summary`

**Response:**
```json
{
  "period": "month",
  "dateRange": {
    "start": "2024-01-01T00:00:00Z",
    "end": "2024-01-31T23:59:59Z"
  },
  "summary": {
    "totalRequests": 1247,
    "totalCost": 156.78,
    "averageResponseTime": 1200,
    "successRate": 98.5,
    "platformUsage": {
      "requests": 623,
      "cost": 78.90,
      "percentage": 50.0
    },
    "clientUsage": {
      "requests": 624,
      "cost": 77.88,
      "percentage": 50.0
    }
  },
  "breakdown": {
    "byFeature": [
      {
        "feature": "photo-batch-processing",
        "requests": 456,
        "cost": 89.23,
        "averageTime": 1500,
        "successRate": 99.1
      },
      {
        "feature": "menu-optimization",
        "requests": 234,
        "cost": 34.55,
        "averageTime": 800,
        "successRate": 98.7
      }
    ],
    "dailyUsage": [
      {
        "date": "2024-01-15",
        "requests": 45,
        "cost": 5.67,
        "peakHour": "14:00",
        "features": ["photo-processing", "venue-planning"]
      }
    ]
  },
  "predictions": {
    "nextMonthCost": 172.45,
    "quotaExhaustion": "2024-02-25T00:00:00Z",
    "recommendedUpgrade": "professional-tier"
  }
}
```

### 4. Real-time Processing Status

**Endpoint:** `GET /api/ai/status/{requestId}`

**Description:** Get real-time status of AI processing requests.

**Response:**
```json
{
  "requestId": "req_123456789",
  "status": "queued|processing|completed|failed",
  "progress": {
    "percentage": 75,
    "currentStep": "analyzing_photos",
    "estimatedTimeRemaining": 300,
    "stepsCompleted": ["validation", "preprocessing", "ai_analysis"],
    "stepsRemaining": ["post_processing", "quality_check"]
  },
  "provider": {
    "type": "client",
    "model": "gpt-4",
    "queuePosition": 2
  },
  "costs": {
    "estimated": 0.45,
    "accrued": 0.31
  }
}
```

## Wedding Industry Specific APIs

### Photography AI Processing

**Endpoint:** `POST /api/ai/photography/process`

**Specialized endpoint for photography-related AI processing.**

**Request:**
```json
{
  "type": "photo-tagging|album-creation|quality-assessment|style-matching",
  "weddingId": "wedding_123",
  "photos": [
    {
      "id": "photo_001",
      "url": "https://secure.wedsync.com/photos/photo_001.jpg",
      "metadata": {
        "timestamp": "2024-01-15T14:30:00Z",
        "location": "ceremony",
        "camera": "Canon R5",
        "photographer": "photographer_456"
      }
    }
  ],
  "processingOptions": {
    "tagCategories": ["people", "emotions", "moments", "objects"],
    "qualityThresholds": {
      "blur": 0.8,
      "exposure": 0.7,
      "composition": 0.6
    },
    "styleReference": "romantic|classic|modern|rustic",
    "outputFormat": "json|xml|csv"
  }
}
```

**Response:**
```json
{
  "success": true,
  "processedPhotos": [
    {
      "photoId": "photo_001",
      "aiAnalysis": {
        "tags": [
          {"tag": "first-kiss", "confidence": 0.95},
          {"tag": "bride-joy", "confidence": 0.92},
          {"tag": "wedding-ceremony", "confidence": 0.98}
        ],
        "qualityScore": 8.7,
        "qualityIssues": [],
        "suggestedEdits": [
          {"type": "brightness", "adjustment": "+5%"},
          {"type": "contrast", "adjustment": "+3%"}
        ],
        "albumSuitability": {
          "heroImage": true,
          "socialMedia": true,
          "printQuality": "excellent"
        }
      }
    }
  ],
  "batchSummary": {
    "totalProcessed": 1,
    "averageQualityScore": 8.7,
    "recommendedForAlbum": 1,
    "processingTime": 1456,
    "cost": 0.34
  }
}
```

### Venue Coordination AI

**Endpoint:** `POST /api/ai/venue/optimize`

**Request:**
```json
{
  "weddingId": "wedding_123",
  "venueId": "venue_456",
  "optimizationType": "layout|timeline|logistics|capacity",
  "constraints": {
    "guestCount": 150,
    "mobility": ["wheelchair-accessible"],
    "weather": {
      "backup": "indoor",
      "forecast": "partly-cloudy",
      "precipitationChance": 30
    },
    "vendor_requirements": [
      {
        "vendor": "caterer_789",
        "needs": ["kitchen-access", "power", "water"],
        "setupTime": 120
      }
    ]
  },
  "preferences": {
    "priority": "guest-experience|cost-optimization|efficiency",
    "flexibility": "high|medium|low"
  }
}
```

### Catering Menu AI

**Endpoint:** `POST /api/ai/catering/menu-optimize`

**Request:**
```json
{
  "weddingId": "wedding_123",
  "guestData": {
    "totalCount": 150,
    "dietary": {
      "vegetarian": 12,
      "vegan": 8,
      "glutenFree": 15,
      "halal": 6,
      "kosher": 3,
      "allergies": {
        "nuts": 4,
        "shellfish": 2,
        "dairy": 7
      }
    },
    "cultural": {
      "preferences": ["italian", "mediterranean", "asian-fusion"],
      "restrictions": ["no-pork", "no-alcohol"]
    }
  },
  "budget": {
    "perPerson": 85.00,
    "total": 12750.00,
    "flexibility": 10
  },
  "serviceStyle": "plated|buffet|family-style|cocktail",
  "season": "spring|summer|fall|winter"
}
```

## Error Handling

### Standard Error Response

```json
{
  "success": false,
  "error": {
    "code": "AI_PROCESSING_FAILED",
    "message": "AI processing request failed due to rate limiting",
    "details": {
      "provider": "openai",
      "quotaRemaining": 0,
      "resetTime": "2024-01-15T16:00:00Z",
      "suggestedAction": "switch_to_client_ai_or_wait"
    },
    "retryable": true,
    "retryAfter": 3600
  },
  "fallback": {
    "available": true,
    "provider": "client-ai",
    "estimatedCost": 0.65,
    "estimatedTime": 1800
  }
}
```

### Error Codes

| Code | Description | Action |
|------|-------------|--------|
| `INVALID_API_KEY` | Invalid or expired API key | Check authentication |
| `QUOTA_EXCEEDED` | Platform AI quota exhausted | Switch to client AI or wait |
| `CLIENT_AI_CONFIG_INVALID` | Client AI setup issue | Verify client API key |
| `PROCESSING_TIMEOUT` | AI processing took too long | Retry with longer timeout |
| `CONTENT_POLICY_VIOLATION` | Request violates AI content policy | Modify request content |
| `RATE_LIMIT_EXCEEDED` | Too many requests | Implement backoff strategy |
| `INSUFFICIENT_BALANCE` | Account balance too low | Add payment method |
| `PROVIDER_UNAVAILABLE` | AI provider temporarily unavailable | Use alternative provider |

## Rate Limits

### Platform AI Limits

| Tier | Requests/Hour | Monthly Quota | Burst Limit |
|------|---------------|---------------|-------------|
| Free | 100 | 1,000 | 10/minute |
| Starter | 500 | 10,000 | 50/minute |
| Professional | 2,000 | 50,000 | 200/minute |
| Scale | 10,000 | 200,000 | 500/minute |
| Enterprise | Unlimited | Unlimited | 1000/minute |

### Client AI Considerations

Client AI usage is limited by:
- Supplier's own API quotas with providers
- Payment method limits
- Provider-specific rate limits
- WedSync safety limits (configurable)

## Webhooks

### AI Processing Completion

Configure webhooks to receive notifications when AI processing completes:

**Endpoint Configuration:**
```json
{
  "url": "https://your-app.com/webhooks/ai-complete",
  "events": ["ai.processing.completed", "ai.processing.failed"],
  "secret": "webhook_secret_for_verification"
}
```

**Webhook Payload:**
```json
{
  "event": "ai.processing.completed",
  "timestamp": "2024-01-15T10:34:27Z",
  "data": {
    "requestId": "req_123456789",
    "supplierId": "supplier_456",
    "weddingId": "wedding_789",
    "processingType": "photo-batch-processing",
    "result": {
      "success": true,
      "processingTime": 1456,
      "cost": 0.43,
      "provider": "client-ai"
    }
  }
}
```

## SDK Examples

### JavaScript/Node.js

```javascript
import WedSyncAI from '@wedsync/ai-sdk';

const ai = new WedSyncAI({
  apiKey: 'ws_api_key_your_key_here',
  baseURL: 'https://api.wedsync.com',
});

// Photo processing
const photoResult = await ai.photography.processPhotos({
  photos: [{ id: 'photo_001', url: 'https://example.com/photo.jpg' }],
  type: 'photo-tagging',
  options: {
    tagCategories: ['people', 'emotions', 'moments'],
    qualityCheck: true
  }
});

// Menu optimization
const menuResult = await ai.catering.optimizeMenu({
  guestCount: 150,
  dietary: { vegetarian: 12, glutenFree: 8 },
  budget: 85.00,
  preferences: ['italian', 'mediterranean']
});

// Real-time status monitoring
const statusStream = ai.monitoring.watchRequest('req_123456789');
statusStream.on('progress', (update) => {
  console.log(`Processing: ${update.progress.percentage}%`);
});
```

### Python

```python
from wedsync_ai import WedSyncAI

ai = WedSyncAI(api_key='ws_api_key_your_key_here')

# Venue optimization
venue_result = ai.venue.optimize(
    wedding_id='wedding_123',
    guest_count=150,
    constraints={
        'mobility': ['wheelchair-accessible'],
        'weather_backup': 'indoor'
    }
)

# Migration to client AI
migration = ai.migration.setup_client_ai(
    provider='openai',
    api_key='encrypted_client_key',
    preferences={
        'models': ['gpt-4', 'gpt-3.5-turbo'],
        'max_daily_cost': 50.00
    }
)
```

### PHP

```php
<?php
use WedSync\AI\Client;

$ai = new Client([
    'api_key' => 'ws_api_key_your_key_here',
    'base_url' => 'https://api.wedsync.com'
]);

// Photo album creation
$album = $ai->photography()->createAlbum([
    'wedding_id' => 'wedding_123',
    'photos' => $photoArray,
    'style' => 'romantic',
    'page_count' => 80
]);

// Usage analytics
$usage = $ai->analytics()->getUsage([
    'period' => 'month',
    'breakdown' => 'by_feature'
]);
```

## Best Practices

### 1. Cost Optimization

```javascript
// Set budget limits
const result = await ai.process({
  type: 'photo-processing',
  data: photos,
  preferences: {
    maxCost: 5.00,
    preferredProvider: 'auto', // Let system choose
    fallbackToClient: true
  }
});
```

### 2. Error Handling

```javascript
try {
  const result = await ai.process(request);
} catch (error) {
  if (error.code === 'QUOTA_EXCEEDED') {
    // Switch to client AI
    const clientResult = await ai.process({
      ...request,
      preferences: { preferredProvider: 'client' }
    });
  } else if (error.retryable) {
    // Implement exponential backoff
    await sleep(error.retryAfter * 1000);
    const retryResult = await ai.process(request);
  }
}
```

### 3. Batch Processing

```javascript
// Process multiple photos efficiently
const batchResult = await ai.photography.processBatch({
  photos: largePhotoArray,
  batchSize: 25, // Process in chunks
  concurrency: 3, // Max 3 concurrent batches
  onProgress: (completed, total) => {
    console.log(`Progress: ${completed}/${total}`);
  }
});
```

### 4. Monitoring and Alerts

```javascript
// Set up cost alerts
await ai.monitoring.createAlert({
  type: 'cost_threshold',
  threshold: 100.00,
  period: 'month',
  webhook: 'https://your-app.com/alerts/cost'
});

// Monitor quota usage
const quotaStatus = await ai.monitoring.getQuotaStatus();
if (quotaStatus.platformAI.remaining < 100) {
  console.warn('Platform AI quota running low');
}
```

## Security Considerations

### API Key Security

- **Never expose API keys** in client-side code
- **Rotate keys regularly** (quarterly minimum)
- **Use environment variables** for key storage
- **Implement key scoping** for different environments

### Client AI Configuration

- **Encrypt client API keys** before storage
- **Validate provider credentials** before processing
- **Monitor client AI costs** to prevent overages
- **Implement circuit breakers** for failed providers

### Data Privacy

- **Anonymize personal data** before AI processing
- **Implement data retention policies** 
- **Ensure GDPR compliance** for EU customers
- **Log all processing activities** for audit trails

## Support and Resources

- **Documentation**: https://docs.wedsync.com/ai-system
- **API Status**: https://status.wedsync.com
- **SDK Repository**: https://github.com/wedsync/ai-sdk
- **Community Forum**: https://community.wedsync.com/ai
- **Support Email**: ai-support@wedsync.com
- **Emergency Contact**: +1-555-WEDSYNC

---

*This documentation is version 1.0 and covers the WedSync Dual AI System as of January 2024. For the latest updates and features, please check our online documentation.*