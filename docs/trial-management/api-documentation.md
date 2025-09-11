# Trial Management System - API Documentation

## Overview

The Trial Management System API provides endpoints for managing trial lifecycles, tracking progress, and generating business intelligence. All endpoints require authentication and implement rate limiting.

## Base URL
```
https://wedsync.com/api/trial
```

## Authentication
All API endpoints require a valid JWT token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

## Rate Limiting
- **Standard**: 100 requests per minute per user
- **Analytics**: 20 requests per minute per user
- **Bulk Operations**: 10 requests per minute per user

## Core Endpoints

### Get Trial Status
```http
GET /api/trial/status
```

Returns current trial status, progress, and metrics for the authenticated organization.

#### Response
```json
{
  "success": true,
  "trial": {
    "id": "trial_123",
    "status": "active",
    "created_at": "2024-01-15T10:00:00Z",
    "expires_at": "2024-02-14T10:00:00Z",
    "business_type": "wedding_planner"
  },
  "progress": {
    "days_elapsed": 15,
    "days_remaining": 15,
    "progress_percentage": 67.5,
    "urgency_score": 2,
    "milestones_achieved": [
      {
        "id": "milestone_001",
        "name": "Client Registration",
        "achieved_at": "2024-01-16T14:30:00Z",
        "points": 10
      }
    ],
    "milestones_remaining": [
      {
        "id": "milestone_002", 
        "name": "Journey Creation",
        "points": 15,
        "description": "Create your first customer journey"
      }
    ],
    "roi_metrics": {
      "total_time_saved_hours": 23.5,
      "estimated_cost_savings": 1175.00,
      "roi_percentage": 156.7,
      "efficiency_gain": 34.2
    }
  }
}
```

#### Error Responses
```json
{
  "success": false,
  "message": "Trial not found",
  "code": "TRIAL_NOT_FOUND"
}
```

### Start New Trial
```http
POST /api/trial/start
```

Initializes a new trial for the authenticated organization.

#### Request Body
```json
{
  "business_type": "wedding_planner",
  "trial_length_days": 30,
  "feature_set": "professional"
}
```

#### Response
```json
{
  "success": true,
  "trial": {
    "id": "trial_456",
    "status": "active",
    "created_at": "2024-01-20T09:15:00Z",
    "expires_at": "2024-02-19T09:15:00Z",
    "business_type": "wedding_planner",
    "feature_set": "professional"
  },
  "initial_milestones": [
    {
      "id": "milestone_001",
      "name": "Account Setup",
      "points": 5,
      "auto_completed": true
    }
  ]
}
```

### Record Feature Usage
```http
POST /api/trial/usage
```

Records feature usage for trial analytics and milestone progress.

#### Request Body
```json
{
  "feature_name": "customer_journey_builder",
  "action": "journey_created",
  "metadata": {
    "journey_id": "journey_789",
    "steps_count": 5,
    "estimated_time_saved": 2.5
  }
}
```

#### Response
```json
{
  "success": true,
  "usage_recorded": true,
  "milestone_progress": {
    "milestone_achieved": true,
    "milestone_id": "milestone_002",
    "points_earned": 15
  },
  "updated_metrics": {
    "total_time_saved_hours": 26.0,
    "roi_percentage": 167.3
  }
}
```

### Get Milestones
```http
GET /api/trial/milestones
```

Returns all milestones for the current trial with achievement status.

#### Query Parameters
- `status` (optional): `achieved` | `remaining` | `all`
- `category` (optional): Filter by milestone category

#### Response
```json
{
  "success": true,
  "milestones": {
    "achieved": [
      {
        "id": "milestone_001",
        "name": "Client Registration", 
        "category": "setup",
        "points": 10,
        "achieved_at": "2024-01-16T14:30:00Z",
        "time_to_achieve_hours": 28.5
      }
    ],
    "remaining": [
      {
        "id": "milestone_003",
        "name": "Email Campaign Launch",
        "category": "marketing", 
        "points": 20,
        "estimated_time_hours": 1.0,
        "help_url": "/help/email-campaigns"
      }
    ],
    "total_points": 100,
    "earned_points": 25,
    "completion_percentage": 25.0
  }
}
```

### Get Analytics Data
```http
GET /api/trial/analytics
```

Returns business intelligence and analytics data for the trial.

#### Query Parameters
- `period` (optional): `daily` | `weekly` | `full` (default: `full`)
- `metrics` (optional): Comma-separated list of metrics to include

#### Response
```json
{
  "success": true,
  "analytics": {
    "overview": {
      "trial_health_score": 8.4,
      "conversion_probability": 0.73,
      "engagement_level": "high",
      "risk_factors": []
    },
    "usage_patterns": {
      "daily_active_features": 4.2,
      "peak_usage_hours": [9, 14, 16],
      "feature_adoption_rate": 0.78
    },
    "roi_breakdown": {
      "time_savings": {
        "client_management": 8.5,
        "communication": 6.2,
        "planning": 4.8,
        "documentation": 4.0
      },
      "cost_savings": {
        "automation": 450.00,
        "efficiency": 325.00,
        "error_reduction": 200.00
      }
    },
    "milestone_velocity": {
      "average_days_per_milestone": 2.1,
      "projected_completion": "2024-02-08T00:00:00Z",
      "acceleration_trend": "positive"
    }
  }
}
```

## Webhook Endpoints

### Trial Status Changes
```http
POST /api/trial/webhooks/status-change
```

Webhook endpoint for external systems to receive trial status updates.

#### Webhook Payload
```json
{
  "event": "trial.status.changed",
  "timestamp": "2024-01-20T15:30:00Z",
  "data": {
    "trial_id": "trial_123",
    "organization_id": "org_456",
    "old_status": "active",
    "new_status": "converted",
    "triggered_by": "upgrade_action"
  }
}
```

### Milestone Achievements
```http
POST /api/trial/webhooks/milestone-achieved
```

#### Webhook Payload
```json
{
  "event": "trial.milestone.achieved",
  "timestamp": "2024-01-20T15:30:00Z", 
  "data": {
    "trial_id": "trial_123",
    "milestone_id": "milestone_005",
    "milestone_name": "First Revenue Generated",
    "points_earned": 25,
    "achievement_time_hours": 72.3,
    "roi_impact": {
      "time_saved": 3.5,
      "cost_savings": 175.00
    }
  }
}
```

## Error Codes

| Code | Description |
|------|-------------|
| `TRIAL_NOT_FOUND` | No active trial for organization |
| `TRIAL_EXPIRED` | Trial period has ended |
| `INVALID_FEATURE` | Feature name not recognized |
| `MILESTONE_ALREADY_ACHIEVED` | Attempting to achieve completed milestone |
| `USAGE_LIMIT_EXCEEDED` | Feature usage limits reached |
| `INVALID_BUSINESS_TYPE` | Business type not supported |
| `RATE_LIMIT_EXCEEDED` | API rate limits exceeded |

## SDK Examples

### JavaScript/TypeScript
```typescript
import { TrialAPI } from '@wedsync/trial-sdk';

const trialAPI = new TrialAPI({
  baseURL: 'https://wedsync.com/api/trial',
  apiKey: 'your-api-key'
});

// Get trial status
const status = await trialAPI.getStatus();

// Record feature usage
await trialAPI.recordUsage('customer_journey_builder', 'journey_created', {
  journey_id: 'journey_789',
  steps_count: 5
});

// Get analytics
const analytics = await trialAPI.getAnalytics({
  period: 'weekly',
  metrics: ['roi_breakdown', 'usage_patterns']
});
```

### React Hook Usage
```typescript
import { useTrialStatus } from '@/hooks/useTrialStatus';

function TrialDashboard() {
  const {
    data,
    progress,
    isLoading,
    error,
    refresh,
    isTrialActive,
    shouldShowUpgrade
  } = useTrialStatus({
    refreshInterval: 30000,
    realtimeUpdates: true
  });

  if (isLoading) return <Loading />;
  if (error) return <Error message={error} />;

  return (
    <div>
      <h2>Trial Progress: {progress?.progress_percentage}%</h2>
      <p>Days Remaining: {progress?.days_remaining}</p>
      {shouldShowUpgrade && <UpgradeButton />}
    </div>
  );
}
```

## Performance Considerations

### Caching
- Trial status cached for 60 seconds
- Analytics data cached for 5 minutes
- Milestone data real-time with optimistic updates

### Pagination
Large result sets use cursor-based pagination:
```json
{
  "data": [...],
  "pagination": {
    "next_cursor": "cursor_123",
    "has_more": true,
    "total_count": 245
  }
}
```

### Response Times
- Standard endpoints: <100ms
- Analytics endpoints: <500ms
- Bulk operations: <2s

## Security

### Data Validation
All inputs are validated and sanitized:
- String length limits enforced
- Numeric ranges validated
- HTML content sanitized
- SQL injection prevention

### Rate Limiting Headers
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642694400
```

### Audit Logging
All API calls are logged with:
- User identification
- Request/response data
- Timestamp and duration
- IP address and user agent

---

**API Version**: 1.0  
**Last Updated**: 2025-08-27  
**Support**: api-support@wedsync.com