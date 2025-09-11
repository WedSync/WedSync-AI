# API Reference - WS-182 Churn Intelligence System

## Overview

The Churn Intelligence API provides endpoints for churn prediction, retention campaign management, business intelligence data, and quality monitoring. All endpoints require authentication and follow RESTful conventions.

## 🔐 Authentication

All API requests require a valid JWT token in the Authorization header:

```bash
Authorization: Bearer <jwt_token>
```

### Authentication Scopes
- `churn:read` - Access to prediction and analytics data
- `churn:write` - Create and update predictions and campaigns
- `churn:admin` - Full access including quality monitoring
- `bi:read` - Business intelligence dashboard access

## 📊 Base URL

```
Production: https://wedsync.com/api/churn
Staging: https://staging.wedsync.com/api/churn
Development: http://localhost:3000/api/churn
```

## 🤖 Churn Prediction Endpoints

### GET /api/churn/predict/{supplierId}

Retrieve churn prediction for a specific supplier.

**Parameters:**
- `supplierId` (string, required) - Unique supplier identifier

**Query Parameters:**
- `include_factors` (boolean, default: false) - Include risk factor breakdown
- `model_version` (string, optional) - Specific model version to use

**Response:**
```json
{
  "supplierId": "supplier_001",
  "churnProbability": 0.743,
  "riskLevel": "high",
  "confidence": 0.892,
  "predictionDate": "2025-08-30T10:00:00Z",
  "modelVersion": "v2.1.3",
  "riskFactors": [
    {
      "factor": "login_frequency_decline",
      "importance": 0.234,
      "value": "15_days_since_last_login",
      "impact": "negative"
    },
    {
      "factor": "revenue_trend",
      "importance": 0.198,
      "value": "-12%_monthly_decline",
      "impact": "negative"
    }
  ],
  "recommendations": [
    {
      "type": "engagement_campaign",
      "priority": "high",
      "expectedImpact": 0.35,
      "description": "Targeted re-engagement campaign"
    }
  ]
}
```

**Status Codes:**
- `200` - Success
- `404` - Supplier not found
- `429` - Rate limit exceeded
- `500` - Internal server error

### POST /api/churn/predict/batch

Batch churn prediction for multiple suppliers.

**Request Body:**
```json
{
  "supplierIds": ["supplier_001", "supplier_002", "supplier_003"],
  "options": {
    "includeFactor": true,
    "modelVersion": "v2.1.3",
    "priority": "normal"
  }
}
```

**Response:**
```json
{
  "predictions": [
    {
      "supplierId": "supplier_001",
      "churnProbability": 0.743,
      "riskLevel": "high",
      "confidence": 0.892
    }
  ],
  "batchId": "batch_12345",
  "processedCount": 3,
  "failedCount": 0,
  "processingTime": 1247,
  "metadata": {
    "modelVersion": "v2.1.3",
    "timestamp": "2025-08-30T10:00:00Z"
  }
}
```

### GET /api/churn/predictions

Retrieve historical predictions with filtering.

**Query Parameters:**
- `supplierId` (string, optional) - Filter by supplier
- `riskLevel` (string, optional) - Filter by risk level: low, medium, high, critical
- `startDate` (ISO string, optional) - Start date for date range filter
- `endDate` (ISO string, optional) - End date for date range filter
- `limit` (number, default: 100) - Maximum results to return
- `offset` (number, default: 0) - Pagination offset

**Response:**
```json
{
  "predictions": [
    {
      "id": "pred_001",
      "supplierId": "supplier_001",
      "churnProbability": 0.743,
      "riskLevel": "high",
      "predictionDate": "2025-08-30T10:00:00Z",
      "actualOutcome": null,
      "modelVersion": "v2.1.3"
    }
  ],
  "pagination": {
    "total": 1250,
    "limit": 100,
    "offset": 0,
    "hasMore": true
  }
}
```

## 📧 Retention Campaign Endpoints

### POST /api/churn/campaigns

Create a new retention campaign.

**Request Body:**
```json
{
  "name": "High Risk Q4 2025 Campaign",
  "description": "Targeted campaign for high-risk suppliers",
  "criteria": {
    "riskLevel": ["high", "critical"],
    "segments": ["premium", "established"],
    "minimumRevenue": 1000,
    "excludeRecent": true
  },
  "campaign": {
    "type": "multi_channel",
    "channels": ["email", "sms", "phone"],
    "template": "retention_v2",
    "schedule": {
      "startDate": "2025-09-01T09:00:00Z",
      "frequency": "weekly",
      "duration": "4_weeks"
    }
  },
  "automation": {
    "enabled": true,
    "triggerConditions": {
      "riskScoreIncrease": 0.1,
      "engagementDrop": 0.3
    }
  }
}
```

**Response:**
```json
{
  "campaignId": "camp_001",
  "status": "created",
  "targetedSuppliers": 234,
  "estimatedCost": 1170.00,
  "projectedROI": 4.2,
  "createdAt": "2025-08-30T10:00:00Z",
  "schedule": {
    "nextExecution": "2025-09-01T09:00:00Z",
    "totalExecutions": 4
  }
}
```

### GET /api/churn/campaigns/{campaignId}

Retrieve campaign details and performance metrics.

**Response:**
```json
{
  "campaignId": "camp_001",
  "name": "High Risk Q4 2025 Campaign",
  "status": "active",
  "progress": {
    "totalTargeted": 234,
    "contacted": 187,
    "responded": 89,
    "retained": 56
  },
  "metrics": {
    "responseRate": 0.476,
    "retentionRate": 0.629,
    "costPerRetention": 20.89,
    "roi": 4.7,
    "effectiveness": "above_average"
  },
  "executionHistory": [
    {
      "date": "2025-09-01T09:00:00Z",
      "channel": "email",
      "sent": 234,
      "delivered": 229,
      "opened": 156,
      "clicked": 89
    }
  ]
}
```

### PUT /api/churn/campaigns/{campaignId}

Update campaign configuration or status.

**Request Body:**
```json
{
  "status": "paused",
  "reason": "Budget constraints",
  "modifications": {
    "schedule": {
      "frequency": "biweekly"
    },
    "channels": ["email", "sms"]
  }
}
```

## 📊 Business Intelligence Endpoints

### GET /api/churn/analytics/dashboard

Retrieve comprehensive dashboard data.

**Query Parameters:**
- `timeframe` (string, default: 30d) - Analysis timeframe: 7d, 30d, 90d, 1y
- `segments` (array, optional) - Supplier segments to include
- `metrics` (array, optional) - Specific metrics to include

**Response:**
```json
{
  "timeframe": "30d",
  "generatedAt": "2025-08-30T10:00:00Z",
  "overview": {
    "totalSuppliers": 5247,
    "atRiskSuppliers": 421,
    "churnRate": 0.083,
    "retentionRate": 0.917,
    "revenueAtRisk": 2340000
  },
  "trends": {
    "churnRateTrend": "+2.3%",
    "revenueImpactTrend": "-5.7%",
    "retentionEffectiveness": "+15.2%"
  },
  "segmentation": [
    {
      "segment": "premium",
      "count": 892,
      "churnRate": 0.051,
      "avgRevenue": 4250,
      "riskDistribution": {
        "low": 623,
        "medium": 189,
        "high": 67,
        "critical": 13
      }
    }
  ],
  "topRiskFactors": [
    {
      "factor": "engagement_decline",
      "prevalence": 0.342,
      "avgImpact": 0.278,
      "trend": "increasing"
    }
  ]
}
```

### GET /api/churn/analytics/revenue-impact

Analyze revenue impact of churn and retention efforts.

**Response:**
```json
{
  "currentPeriod": {
    "totalRevenueLoss": 890000,
    "preventedRevenueLoss": 1230000,
    "retentionROI": 4.85,
    "costOfRetention": 253600
  },
  "projections": {
    "next30Days": {
      "projectedChurn": 67,
      "projectedRevenueLoss": 334000,
      "preventionOpportunity": 0.65
    },
    "next90Days": {
      "projectedChurn": 198,
      "projectedRevenueLoss": 987000,
      "preventionOpportunity": 0.58
    }
  },
  "segmentAnalysis": [
    {
      "segment": "premium",
      "avgLTV": 45000,
      "churnImpact": "critical",
      "retentionPriority": "highest"
    }
  ]
}
```

### GET /api/churn/analytics/cohorts

Cohort analysis for supplier retention patterns.

**Query Parameters:**
- `cohortType` (string, default: monthly) - Cohort grouping: daily, weekly, monthly, quarterly
- `metric` (string, default: retention) - Analysis metric: retention, revenue, engagement
- `periods` (number, default: 12) - Number of periods to analyze

**Response:**
```json
{
  "cohortType": "monthly",
  "metric": "retention",
  "periods": 12,
  "cohorts": [
    {
      "cohortDate": "2024-09-01",
      "initialSize": 234,
      "retentionRates": [1.0, 0.94, 0.89, 0.85, 0.82, 0.79, 0.76, 0.73, 0.71, 0.68, 0.66, 0.64],
      "revenuePerCohort": [125000, 117500, 111250, 106250, 102500, 98750, 95000, 91250, 88750, 85000, 82500, 80000]
    }
  ],
  "insights": [
    {
      "type": "trend",
      "description": "September cohort shows 15% better retention than average",
      "significance": "high"
    }
  ]
}
```

## 🔍 Quality Monitoring Endpoints

### GET /api/churn/quality/status

Retrieve current system quality status.

**Response:**
```json
{
  "overallScore": 94.7,
  "status": "healthy",
  "lastUpdated": "2025-08-30T10:00:00Z",
  "components": {
    "modelAccuracy": {
      "score": 87.3,
      "threshold": 85.0,
      "status": "healthy",
      "trend": "stable"
    },
    "dataQuality": {
      "score": 96.2,
      "threshold": 90.0,
      "status": "healthy",
      "issues": []
    },
    "responseTime": {
      "avgLatency": 147,
      "threshold": 200,
      "status": "healthy",
      "p95": 189
    },
    "systemAvailability": {
      "uptime": 99.94,
      "threshold": 99.9,
      "status": "healthy",
      "incidents": 0
    }
  },
  "alerts": {
    "active": 0,
    "warnings": 1,
    "recent": [
      {
        "type": "warning",
        "message": "Minor drift detected in engagement features",
        "timestamp": "2025-08-30T08:30:00Z",
        "severity": "low"
      }
    ]
  }
}
```

### POST /api/churn/quality/validate

Trigger quality validation checks.

**Request Body:**
```json
{
  "checks": ["model_accuracy", "data_quality", "business_rules"],
  "scope": {
    "dateRange": {
      "start": "2025-08-23T00:00:00Z",
      "end": "2025-08-30T00:00:00Z"
    },
    "sampleSize": 1000
  },
  "options": {
    "strictMode": true,
    "generateReport": true
  }
}
```

**Response:**
```json
{
  "validationId": "val_001",
  "status": "completed",
  "results": {
    "overallPassed": true,
    "score": 92.4,
    "checkResults": [
      {
        "check": "model_accuracy",
        "passed": true,
        "score": 87.3,
        "threshold": 85.0,
        "details": "Model accuracy within acceptable range"
      }
    ]
  },
  "report": {
    "url": "/api/churn/quality/reports/val_001.pdf",
    "generatedAt": "2025-08-30T10:00:00Z"
  }
}
```

## 📈 Performance Metrics

### GET /api/churn/metrics

Retrieve system performance metrics.

**Query Parameters:**
- `timeframe` (string, default: 1h) - Metrics timeframe: 1h, 6h, 24h, 7d
- `metrics` (array, optional) - Specific metrics to retrieve

**Response:**
```json
{
  "timeframe": "1h",
  "metrics": {
    "predictions": {
      "total": 1247,
      "successful": 1242,
      "failed": 5,
      "avgLatency": 147,
      "p95Latency": 189,
      "errorRate": 0.004
    },
    "campaigns": {
      "triggered": 23,
      "executed": 21,
      "successRate": 0.913
    },
    "quality": {
      "dataQualityScore": 96.2,
      "modelAccuracy": 87.3,
      "driftMeasure": 0.012
    }
  },
  "trends": {
    "predictionsPerMinute": [
      {"timestamp": "2025-08-30T09:00:00Z", "value": 18},
      {"timestamp": "2025-08-30T09:05:00Z", "value": 22}
    ]
  }
}
```

## 🚨 Error Responses

All endpoints return structured error responses:

```json
{
  "error": {
    "code": "CHURN_001",
    "message": "Supplier not found",
    "details": "No supplier found with ID: supplier_001",
    "timestamp": "2025-08-30T10:00:00Z",
    "traceId": "trace_12345"
  },
  "support": {
    "documentation": "https://docs.wedsync.com/churn-intelligence",
    "contact": "api-support@wedsync.com"
  }
}
```

### Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| CHURN_001 | Supplier not found | 404 |
| CHURN_002 | Invalid prediction parameters | 400 |
| CHURN_003 | Model temporarily unavailable | 503 |
| CHURN_004 | Rate limit exceeded | 429 |
| CHURN_005 | Insufficient permissions | 403 |
| CHURN_006 | Campaign not found | 404 |
| CHURN_007 | Invalid campaign configuration | 400 |
| CHURN_008 | Quality validation failed | 422 |
| CHURN_009 | System maintenance mode | 503 |
| CHURN_010 | Data quality issues detected | 422 |

## 🔧 SDK and Integration Examples

### JavaScript SDK

```javascript
import { ChurnIntelligenceClient } from '@wedsync/churn-intelligence-sdk';

const client = new ChurnIntelligenceClient({
  apiKey: process.env.WEDSYNC_API_KEY,
  environment: 'production'
});

// Predict churn for a supplier
const prediction = await client.predict('supplier_001', {
  includeFactors: true,
  modelVersion: 'latest'
});

// Create retention campaign
const campaign = await client.campaigns.create({
  name: 'Q4 Retention Campaign',
  criteria: { riskLevel: ['high', 'critical'] },
  channels: ['email', 'sms']
});
```

### Python Integration

```python
import requests
from typing import List, Dict

class ChurnIntelligenceAPI:
    def __init__(self, api_key: str, base_url: str):
        self.api_key = api_key
        self.base_url = base_url
        self.headers = {
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json'
        }
    
    def predict_churn(self, supplier_id: str) -> Dict:
        response = requests.get(
            f'{self.base_url}/predict/{supplier_id}',
            headers=self.headers
        )
        return response.json()
    
    def batch_predict(self, supplier_ids: List[str]) -> Dict:
        payload = {'supplierIds': supplier_ids}
        response = requests.post(
            f'{self.base_url}/predict/batch',
            headers=self.headers,
            json=payload
        )
        return response.json()
```

### cURL Examples

```bash
# Get churn prediction
curl -X GET "https://wedsync.com/api/churn/predict/supplier_001" \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json"

# Create retention campaign
curl -X POST "https://wedsync.com/api/churn/campaigns" \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "High Risk Campaign",
    "criteria": {"riskLevel": ["high"]},
    "campaign": {"type": "email", "template": "retention_v1"}
  }'

# Check quality status
curl -X GET "https://wedsync.com/api/churn/quality/status" \
  -H "Authorization: Bearer $API_TOKEN"
```

## 📝 Rate Limiting

API rate limits are applied per authentication token:

- **Standard tier**: 100 requests per minute
- **Premium tier**: 500 requests per minute
- **Enterprise tier**: 2000 requests per minute

Rate limit headers are included in all responses:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1693411200
```

## 🔔 Webhooks

Configure webhooks to receive real-time notifications:

### Webhook Events

- `churn.prediction.high_risk` - High-risk prediction created
- `churn.prediction.critical` - Critical risk prediction created
- `campaign.execution.completed` - Retention campaign completed
- `quality.alert.triggered` - Quality issue detected
- `model.accuracy.degraded` - Model performance below threshold

### Webhook Configuration

```json
{
  "url": "https://your-app.com/webhooks/churn",
  "events": ["churn.prediction.high_risk", "quality.alert.triggered"],
  "secret": "your_webhook_secret",
  "active": true
}
```

### Webhook Payload Example

```json
{
  "event": "churn.prediction.high_risk",
  "timestamp": "2025-08-30T10:00:00Z",
  "data": {
    "supplierId": "supplier_001",
    "churnProbability": 0.834,
    "riskLevel": "high",
    "previousRisk": "medium",
    "riskFactors": ["engagement_decline", "revenue_drop"]
  },
  "metadata": {
    "modelVersion": "v2.1.3",
    "predictionId": "pred_001"
  }
}
```

---

**API Version**: v1.0.0  
**Last Updated**: August 30, 2025  
**Support**: api-support@wedsync.com