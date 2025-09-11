# Analytics API Documentation

## 📚 Overview

The WedSync Analytics API provides comprehensive access to vendor performance metrics, client engagement data, and business intelligence insights. This RESTful API supports real-time queries, historical analysis, and predictive analytics for wedding industry professionals.

## 🔐 Authentication

All API endpoints require authentication using JWT tokens obtained through the WedSync authentication system.

```typescript
// Authentication Header
headers: {
  'Authorization': `Bearer ${jwtToken}`,
  'Content-Type': 'application/json'
}
```

### Rate Limiting
- **Standard Users**: 100 requests per minute
- **Professional Users**: 500 requests per minute  
- **Enterprise Users**: 2000 requests per minute
- **API-only Access**: Custom limits based on subscription

## 🏗️ Base URL Structure

```
Production: https://api.wedsync.com/v1/analytics
Staging: https://staging-api.wedsync.com/v1/analytics
Development: http://localhost:3000/api/analytics
```

## 📊 Core Analytics Endpoints

### 1. Dashboard Overview

#### GET `/api/analytics/dashboard`
Retrieves comprehensive dashboard data for vendor performance overview.

**Query Parameters:**
```typescript
interface DashboardQuery {
  timeframe?: '7d' | '30d' | '90d' | '1y' | 'custom';
  startDate?: string; // ISO 8601 format
  endDate?: string;   // ISO 8601 format
  includeMetrics?: string[]; // ['revenue', 'bookings', 'response_time', 'satisfaction']
  compareWith?: string; // 'industry' | 'region' | 'category'
  format?: 'json' | 'summary';
}
```

**Request Example:**
```bash
GET /api/analytics/dashboard?timeframe=30d&includeMetrics=revenue,bookings&compareWith=industry
```

**Response Example:**
```json
{
  "status": "success",
  "data": {
    "overview": {
      "totalRevenue": 125000,
      "activeBookings": 45,
      "responseScore": 87.5,
      "clientSatisfaction": 4.8,
      "marketPosition": 15,
      "lastUpdated": "2025-01-14T10:30:00Z"
    },
    "trends": {
      "revenueGrowth": 12.5,
      "bookingGrowth": 8.3,
      "performanceChange": 5.2,
      "period": "30d"
    },
    "funnel": [
      { "stage": "inquiries", "count": 120, "percentage": 100 },
      { "stage": "qualified", "count": 95, "percentage": 79.2 },
      { "stage": "quoted", "count": 78, "percentage": 65.0 },
      { "stage": "booked", "count": 45, "percentage": 37.5 }
    ],
    "benchmarks": {
      "industry": {
        "responseScore": 82.1,
        "bookingRate": 32.8,
        "clientSatisfaction": 4.6
      },
      "yourPerformance": {
        "responseScore": 87.5,
        "bookingRate": 37.5,
        "clientSatisfaction": 4.8
      }
    },
    "alerts": [
      {
        "type": "opportunity",
        "message": "Response time improved 15% this week",
        "priority": "low",
        "actionRequired": false
      }
    ]
  },
  "meta": {
    "queryTime": "45ms",
    "dataFreshness": "2025-01-14T10:25:00Z",
    "cacheHit": true
  }
}
```

**Error Responses:**
```json
{
  "status": "error",
  "error": {
    "code": "INSUFFICIENT_DATA",
    "message": "Not enough data for the requested timeframe",
    "details": "Minimum 7 days of data required"
  }
}
```

### 2. Journey Analytics

#### GET `/api/analytics/journeys`
Retrieves client journey performance and progression analytics.

**Query Parameters:**
```typescript
interface JourneyQuery {
  journeyId?: string;
  status?: 'active' | 'completed' | 'abandoned';
  clientSegment?: string;
  timeframe?: string;
  includeSteps?: boolean;
  includeBottlenecks?: boolean;
}
```

**Response Example:**
```json
{
  "status": "success",
  "data": {
    "summary": {
      "totalJourneys": 156,
      "completionRate": 78.2,
      "averageDuration": 45.5,
      "dropoffRate": 21.8
    },
    "journeys": [
      {
        "id": "journey_123",
        "clientId": "client_456",
        "status": "active",
        "progress": 67,
        "currentStep": "contract_review",
        "estimatedCompletion": "2025-02-15",
        "bottlenecks": ["document_upload_delay"],
        "acceleration_factors": ["quick_responses", "clear_requirements"]
      }
    ],
    "performance": {
      "fastestCompletion": 12.5,
      "slowestCompletion": 89.3,
      "commonBottlenecks": [
        { "step": "initial_consultation", "avgDelay": 3.2, "frequency": 45 },
        { "step": "contract_negotiation", "avgDelay": 5.7, "frequency": 32 }
      ]
    }
  }
}
```

#### GET `/api/analytics/journeys/{journeyId}`
Retrieves detailed analytics for a specific client journey.

**Path Parameters:**
- `journeyId`: Unique journey identifier

**Response Example:**
```json
{
  "status": "success",
  "data": {
    "journey": {
      "id": "journey_123",
      "name": "Smith Wedding Photography",
      "clientId": "client_456",
      "startDate": "2024-12-01T09:00:00Z",
      "status": "active",
      "progress": 67
    },
    "steps": [
      {
        "id": "step_1",
        "name": "Initial Inquiry",
        "status": "completed",
        "completedAt": "2024-12-01T10:30:00Z",
        "duration": 90,
        "satisfaction": 5
      },
      {
        "id": "step_2", 
        "name": "Consultation Scheduling",
        "status": "completed",
        "completedAt": "2024-12-02T14:15:00Z",
        "duration": 1680,
        "satisfaction": 4
      }
    ],
    "analytics": {
      "clientEngagement": 85.5,
      "responseQuality": 92.1,
      "timelineAdherence": 78.3,
      "predictionAccuracy": 91.7
    }
  }
}
```

### 3. Vendor Performance Metrics

#### GET `/api/analytics/vendors/performance`
Retrieves comprehensive vendor performance metrics.

**Query Parameters:**
```typescript
interface VendorPerformanceQuery {
  vendorId?: string;
  category?: 'photographer' | 'venue' | 'catering' | 'florist' | 'music';
  region?: string;
  timeframe?: string;
  metrics?: string[]; // ['response_time', 'booking_rate', 'satisfaction', 'revenue']
  includeComparison?: boolean;
  includeHistory?: boolean;
}
```

**Response Example:**
```json
{
  "status": "success",
  "data": {
    "vendor": {
      "id": "vendor_789",
      "name": "Elite Wedding Photography",
      "category": "photographer",
      "region": "London"
    },
    "currentPeriod": {
      "responseTime": {
        "average": 2.3,
        "median": 1.8,
        "p95": 4.2,
        "businessHours": 1.2,
        "weekends": 3.1,
        "score": 87.5
      },
      "bookingMetrics": {
        "inquiries": 45,
        "qualified": 38,
        "quoted": 32,
        "booked": 18,
        "conversionRate": 40.0,
        "averageValue": 2850
      },
      "clientSatisfaction": {
        "overall": 4.8,
        "communication": 4.9,
        "quality": 4.7,
        "value": 4.6,
        "responsiveness": 4.8,
        "reviewCount": 127
      }
    },
    "trends": {
      "responseTime": [
        { "period": "2024-11", "value": 2.8 },
        { "period": "2024-12", "value": 2.5 },
        { "period": "2025-01", "value": 2.3 }
      ],
      "bookingRate": [
        { "period": "2024-11", "value": 35.2 },
        { "period": "2024-12", "value": 38.1 },
        { "period": "2025-01", "value": 40.0 }
      ]
    },
    "benchmarks": {
      "industry": {
        "responseTime": 3.1,
        "bookingRate": 32.5,
        "satisfaction": 4.5
      },
      "region": {
        "responseTime": 2.9,
        "bookingRate": 34.2,
        "satisfaction": 4.6
      },
      "category": {
        "responseTime": 2.7,
        "bookingRate": 36.1,
        "satisfaction": 4.7
      }
    }
  }
}
```

### 4. Revenue Analytics

#### GET `/api/analytics/revenue`
Retrieves detailed revenue analytics and financial performance metrics.

**Query Parameters:**
```typescript
interface RevenueQuery {
  period?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  startDate?: string;
  endDate?: string;
  breakdown?: 'service' | 'client_type' | 'region' | 'season';
  includeProjections?: boolean;
  includeTaxData?: boolean;
}
```

**Response Example:**
```json
{
  "status": "success", 
  "data": {
    "summary": {
      "totalRevenue": 125000,
      "netRevenue": 98750,
      "growth": 12.5,
      "averageBookingValue": 2500,
      "totalBookings": 50,
      "pendingRevenue": 15000
    },
    "breakdown": {
      "byService": [
        { "service": "wedding_photography", "revenue": 85000, "percentage": 68.0 },
        { "service": "engagement_sessions", "revenue": 25000, "percentage": 20.0 },
        { "service": "additional_hours", "revenue": 15000, "percentage": 12.0 }
      ],
      "byMonth": [
        { "month": "2024-11", "revenue": 32000, "bookings": 13 },
        { "month": "2024-12", "revenue": 45000, "bookings": 18 },
        { "month": "2025-01", "revenue": 48000, "bookings": 19 }
      ]
    },
    "metrics": {
      "averagePaymentTime": 14.5,
      "disputeRate": 0.02,
      "refundRate": 0.01,
      "profitMargin": 72.3,
      "seasonalVariation": 28.5
    },
    "projections": {
      "nextMonth": 52000,
      "nextQuarter": 145000,
      "yearEnd": 580000,
      "confidence": 87.2
    }
  }
}
```

### 5. Client Analytics

#### GET `/api/analytics/clients`
Retrieves client behavior analytics and engagement metrics.

**Query Parameters:**
```typescript
interface ClientAnalyticsQuery {
  clientId?: string;
  segment?: 'new' | 'returning' | 'high_value' | 'at_risk';
  weddingDate?: string;
  behavior?: 'engagement' | 'communication' | 'satisfaction';
  includeJourney?: boolean;
}
```

**Response Example:**
```json
{
  "status": "success",
  "data": {
    "summary": {
      "totalClients": 156,
      "newClients": 23,
      "activeJourneys": 45,
      "averageEngagement": 78.5,
      "satisfactionScore": 4.7
    },
    "segments": [
      {
        "segment": "high_value",
        "count": 12,
        "averageValue": 4500,
        "satisfaction": 4.9,
        "characteristics": ["luxury_preference", "quick_decision", "referral_source"]
      }
    ],
    "engagement": {
      "communicationFrequency": 3.2,
      "responseTime": 4.1,
      "documentCompliance": 89.5,
      "meetingAttendance": 94.2,
      "referralActivity": 23.1
    },
    "satisfaction": {
      "overall": 4.7,
      "factors": [
        { "factor": "responsiveness", "score": 4.8, "weight": 0.3 },
        { "factor": "quality", "score": 4.9, "weight": 0.4 },
        { "factor": "value", "score": 4.5, "weight": 0.3 }
      ]
    }
  }
}
```

## 📊 Export & Reporting Endpoints

### 6. Data Export

#### POST `/api/analytics/export`
Creates and downloads custom analytics reports.

**Request Body:**
```typescript
interface ExportRequest {
  reportType: 'performance' | 'revenue' | 'clients' | 'custom';
  format: 'pdf' | 'excel' | 'csv' | 'json';
  timeframe: {
    start: string;
    end: string;
  };
  filters: {
    vendors?: string[];
    clients?: string[];
    categories?: string[];
    regions?: string[];
  };
  template?: string; // For custom reports
  delivery?: {
    method: 'download' | 'email' | 'webhook';
    recipients?: string[];
    webhook_url?: string;
  };
}
```

**Request Example:**
```json
{
  "reportType": "performance",
  "format": "excel",
  "timeframe": {
    "start": "2024-12-01",
    "end": "2025-01-31"
  },
  "filters": {
    "categories": ["photographer"],
    "regions": ["London", "Manchester"]
  },
  "delivery": {
    "method": "email",
    "recipients": ["manager@weddingco.com"]
  }
}
```

**Response Example:**
```json
{
  "status": "success",
  "data": {
    "exportId": "export_abc123",
    "status": "processing",
    "estimatedCompletion": "2025-01-14T10:45:00Z",
    "downloadUrl": null,
    "expiresAt": "2025-01-21T10:35:00Z"
  }
}
```

#### GET `/api/analytics/export/{exportId}`
Checks the status and retrieves download link for an export.

**Response Example:**
```json
{
  "status": "success",
  "data": {
    "exportId": "export_abc123",
    "status": "completed",
    "downloadUrl": "https://exports.wedsync.com/analytics/export_abc123.xlsx",
    "fileSize": 1048576,
    "recordCount": 2500,
    "createdAt": "2025-01-14T10:35:00Z",
    "expiresAt": "2025-01-21T10:35:00Z"
  }
}
```

## 🔄 Real-time & Streaming Endpoints

### 7. WebSocket Connections

#### WebSocket `/api/analytics/stream`
Establishes real-time analytics data stream.

**Connection Example:**
```javascript
const ws = new WebSocket('wss://api.wedsync.com/v1/analytics/stream');

ws.onopen = () => {
  // Subscribe to specific analytics channels
  ws.send(JSON.stringify({
    action: 'subscribe',
    channels: ['vendor_performance', 'booking_updates', 'revenue_changes'],
    filters: {
      vendorId: 'vendor_789',
      priority: 'high'
    }
  }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Real-time update:', data);
};
```

**Message Format:**
```json
{
  "type": "analytics_update",
  "channel": "vendor_performance", 
  "timestamp": "2025-01-14T10:35:00Z",
  "data": {
    "vendorId": "vendor_789",
    "metric": "response_time",
    "oldValue": 2.5,
    "newValue": 2.1,
    "changePercent": -16.0,
    "alert": false
  }
}
```

### 8. Server-Sent Events

#### GET `/api/analytics/events`
Establishes Server-Sent Events stream for analytics updates.

**Connection Example:**
```javascript
const eventSource = new EventSource('/api/analytics/events?vendorId=vendor_789');

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  updateAnalyticsDashboard(data);
};

eventSource.addEventListener('performance_alert', (event) => {
  const alert = JSON.parse(event.data);
  showNotification(alert);
});
```

## ⚙️ Configuration & Settings Endpoints

### 9. Analytics Configuration

#### GET `/api/analytics/config`
Retrieves current analytics configuration and preferences.

**Response Example:**
```json
{
  "status": "success",
  "data": {
    "preferences": {
      "defaultTimeframe": "30d",
      "autoRefreshInterval": 300,
      "alertThresholds": {
        "responseTime": 24,
        "bookingRateChange": 10,
        "satisfactionDrop": 0.3
      },
      "dashboardLayout": ["overview", "funnel", "trends", "alerts"]
    },
    "capabilities": {
      "realTimeUpdates": true,
      "customReports": true,
      "apiAccess": true,
      "dataExport": ["pdf", "excel", "csv"],
      "integrations": ["crm", "calendar", "accounting"]
    }
  }
}
```

#### PUT `/api/analytics/config`
Updates analytics configuration and preferences.

**Request Body:**
```json
{
  "preferences": {
    "defaultTimeframe": "90d",
    "autoRefreshInterval": 180,
    "alertThresholds": {
      "responseTime": 12,
      "bookingRateChange": 15
    }
  },
  "notifications": {
    "email": true,
    "push": false,
    "webhook": "https://webhook.example.com/analytics"
  }
}
```

## 🚨 Alert & Notification Endpoints

### 10. Alert Management

#### GET `/api/analytics/alerts`
Retrieves active alerts and notifications.

**Query Parameters:**
```typescript
interface AlertQuery {
  status?: 'active' | 'resolved' | 'snoozed';
  priority?: 'low' | 'medium' | 'high' | 'critical';
  type?: 'performance' | 'revenue' | 'client' | 'system';
  timeframe?: string;
}
```

**Response Example:**
```json
{
  "status": "success",
  "data": {
    "alerts": [
      {
        "id": "alert_123",
        "type": "performance",
        "priority": "high",
        "title": "Response time increase detected",
        "message": "Average response time increased by 35% in the last 24 hours",
        "metric": "response_time",
        "threshold": 2.0,
        "currentValue": 2.7,
        "createdAt": "2025-01-14T08:30:00Z",
        "status": "active",
        "actionRequired": true,
        "suggestions": [
          "Review recent inquiries for complexity",
          "Check staff availability and workload",
          "Consider automated responses for common questions"
        ]
      }
    ],
    "summary": {
      "total": 5,
      "active": 3,
      "high_priority": 1,
      "critical": 0
    }
  }
}
```

#### POST `/api/analytics/alerts/{alertId}/action`
Performs an action on a specific alert (acknowledge, snooze, resolve).

**Request Body:**
```json
{
  "action": "snooze",
  "duration": 3600,
  "note": "Investigating with team"
}
```

## 🔍 Search & Query Endpoints

### 11. Advanced Analytics Search

#### POST `/api/analytics/search`
Performs complex analytics queries using search syntax.

**Request Body:**
```typescript
interface SearchRequest {
  query: string; // Natural language or structured query
  filters?: {
    dateRange?: { start: string, end: string };
    vendors?: string[];
    metrics?: string[];
    aggregation?: 'sum' | 'avg' | 'min' | 'max' | 'count';
  };
  sort?: {
    field: string;
    direction: 'asc' | 'desc';
  };
  limit?: number;
  offset?: number;
}
```

**Request Example:**
```json
{
  "query": "photographers in London with response time < 2 hours and booking rate > 40%",
  "filters": {
    "dateRange": {
      "start": "2024-12-01",
      "end": "2025-01-31"
    }
  },
  "sort": {
    "field": "performance_score",
    "direction": "desc"
  },
  "limit": 20
}
```

## 📈 Predictive Analytics Endpoints

### 12. Forecasting & Predictions

#### POST `/api/analytics/forecast`
Generates predictive analytics and forecasts.

**Request Body:**
```typescript
interface ForecastRequest {
  metric: 'revenue' | 'bookings' | 'performance' | 'demand';
  horizon: number; // Days to forecast
  model?: 'linear' | 'seasonal' | 'ml' | 'auto';
  confidence?: number; // 0.8, 0.9, 0.95
  includeScenarios?: boolean;
}
```

**Response Example:**
```json
{
  "status": "success",
  "data": {
    "forecast": {
      "metric": "revenue",
      "horizon": 90,
      "model": "seasonal",
      "confidence": 0.9,
      "predictions": [
        { "date": "2025-02-01", "predicted": 52000, "lower": 48000, "upper": 56000 },
        { "date": "2025-02-02", "predicted": 53500, "lower": 49300, "upper": 57700 }
      ]
    },
    "insights": [
      "Peak season starting in May will drive 40% revenue increase",
      "Consider capacity planning for April-June period",
      "Booking inquiry volume expected to increase 25% next quarter"
    ],
    "accuracy": {
      "historical": 89.2,
      "model_confidence": 91.5,
      "data_quality": 95.1
    }
  }
}
```

## 🧪 Testing & Validation Endpoints

### 13. Data Quality & Testing

#### GET `/api/analytics/health`
Checks analytics system health and data quality.

**Response Example:**
```json
{
  "status": "success",
  "data": {
    "system": {
      "status": "healthy",
      "uptime": 99.97,
      "latency": 45,
      "throughput": 1247
    },
    "data_quality": {
      "completeness": 98.5,
      "accuracy": 97.2,
      "freshness": 99.1,
      "consistency": 96.8
    },
    "pipeline": {
      "ingestion_rate": 15420,
      "processing_lag": 2.3,
      "error_rate": 0.01,
      "queue_depth": 42
    }
  }
}
```

## 🚫 Error Handling

### Standard Error Codes

| Code | Status | Description |
|------|---------|-------------|
| 400 | Bad Request | Invalid query parameters or request format |
| 401 | Unauthorized | Missing or invalid authentication token |
| 403 | Forbidden | Insufficient permissions for requested resource |
| 404 | Not Found | Requested analytics resource does not exist |
| 422 | Unprocessable Entity | Valid format but invalid data values |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server processing error |
| 503 | Service Unavailable | Analytics service temporarily unavailable |

### Error Response Format

```json
{
  "status": "error",
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid timeframe parameter",
    "details": "Timeframe must be one of: 7d, 30d, 90d, 1y, custom",
    "field": "timeframe",
    "timestamp": "2025-01-14T10:35:00Z"
  },
  "request_id": "req_abc123"
}
```

## 📚 SDK & Integration Examples

### JavaScript/TypeScript SDK

```typescript
import { WedSyncAnalytics } from '@wedsync/analytics-sdk';

const analytics = new WedSyncAnalytics({
  apiKey: process.env.WEDSYNC_API_KEY,
  environment: 'production'
});

// Get dashboard data
const dashboard = await analytics.dashboard.get({
  timeframe: '30d',
  includeMetrics: ['revenue', 'bookings']
});

// Export report
const exportJob = await analytics.export.create({
  reportType: 'performance',
  format: 'excel',
  timeframe: { start: '2024-12-01', end: '2025-01-31' }
});
```

### Python Integration

```python
from wedsync_analytics import WedSyncClient

client = WedSyncClient(
    api_key=os.environ['WEDSYNC_API_KEY'],
    environment='production'
)

# Get vendor performance
performance = client.vendors.performance(
    vendor_id='vendor_789',
    timeframe='30d',
    include_comparison=True
)

# Create forecast
forecast = client.forecast.create(
    metric='revenue',
    horizon=90,
    confidence=0.9
)
```

### Webhook Integration

```typescript
// Webhook endpoint example
app.post('/analytics/webhook', (req, res) => {
  const signature = req.headers['x-wedsync-signature'];
  const payload = req.body;
  
  // Verify webhook signature
  if (!verifyWebhookSignature(payload, signature)) {
    return res.status(401).send('Invalid signature');
  }
  
  // Process analytics update
  switch (payload.type) {
    case 'performance_alert':
      handlePerformanceAlert(payload.data);
      break;
    case 'revenue_update':
      updateRevenueTracking(payload.data);
      break;
    case 'client_milestone':
      trackClientProgress(payload.data);
      break;
  }
  
  res.status(200).send('OK');
});
```

## 🔄 Versioning & Changelog

### API Versioning
- Current Version: `v1`
- Version Header: `Accept: application/vnd.wedsync.v1+json`
- Backward Compatibility: Maintained for 12 months

### Recent Changes
- **v1.2.0** (2025-01-14): Added predictive analytics endpoints
- **v1.1.5** (2025-01-10): Enhanced real-time streaming capabilities
- **v1.1.0** (2024-12-15): Added client journey analytics
- **v1.0.0** (2024-12-01): Initial analytics API release

## 📞 Support & Resources

- **API Documentation**: https://docs.wedsync.com/analytics-api
- **SDK Downloads**: https://github.com/wedsync/analytics-sdk  
- **Postman Collection**: https://postman.wedsync.com/analytics
- **Status Page**: https://status.wedsync.com
- **Support**: api-support@wedsync.com

---

*This documentation is part of the WS-246 Vendor Performance Analytics System. Last updated: January 2025*