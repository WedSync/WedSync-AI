# Environment Variables API Reference

## API Overview

The WS-256 Environment Variables Management System provides 26 REST API endpoints organized into 5 core groups. All endpoints require authentication and follow RESTful conventions with comprehensive error handling.

## Base URL
```
https://your-wedsync-domain.com/api/environment
```

## Authentication

All endpoints require authentication via:
- **Session Cookie**: For web applications
- **API Key**: For programmatic access
- **JWT Token**: For service-to-service communication

Include in headers:
```http
Authorization: Bearer <token>
X-Organization-ID: <org-uuid>
X-User-ID: <user-uuid>
```

## API Groups

### 1. Environment Variable Management API (7 endpoints)

#### 1.1 List Variables
```http
GET /api/environment/variables
```
**Query Parameters:**
- `environment_id`: Filter by environment
- `classification_level`: Filter by security level
- `variable_type`: Filter by type (api_key, database, secret, etc.)
- `search`: Search in keys/descriptions
- `limit`: Results per page (default: 50, max: 100)
- `offset`: Pagination offset

**Response:**
```json
{
  "success": true,
  "variables": [
    {
      "id": "uuid",
      "key": "STRIPE_SECRET_KEY",
      "description": "Stripe payment processing secret",
      "classification_level": 7,
      "variable_type": "api_key",
      "is_required": true,
      "is_encrypted": true,
      "created_at": "2025-09-03T10:30:00Z",
      "updated_at": "2025-09-03T12:45:00Z"
    }
  ],
  "pagination": {
    "total": 150,
    "limit": 50,
    "offset": 0,
    "has_more": true
  }
}
```

#### 1.2 Create Variable
```http
POST /api/environment/variables
```
**Request Body:**
```json
{
  "key": "NEW_API_KEY",
  "description": "Description of the variable",
  "classification_level": 7,
  "variable_type": "api_key",
  "is_required": true,
  "validation_pattern": "^[A-Za-z0-9_-]+$",
  "wedding_critical": false
}
```

**Response:**
```json
{
  "success": true,
  "variable": {
    "id": "new-uuid",
    "key": "NEW_API_KEY",
    "description": "Description of the variable",
    "classification_level": 7,
    "variable_type": "api_key",
    "is_required": true,
    "validation_pattern": "^[A-Za-z0-9_-]+$",
    "wedding_critical": false,
    "created_at": "2025-09-03T14:30:00Z"
  }
}
```

#### 1.3 Get Variable
```http
GET /api/environment/variables/{id}
```

#### 1.4 Update Variable
```http
PUT /api/environment/variables/{id}
```

#### 1.5 Delete Variable
```http
DELETE /api/environment/variables/{id}
```

#### 1.6 Set Variable Value
```http
POST /api/environment/variables/{id}/value
```
**Request Body:**
```json
{
  "environment_id": "env-uuid",
  "value": "secret-value-here",
  "encrypt": true
}
```

#### 1.7 Get Variable Value
```http
GET /api/environment/variables/{id}/value/{environment_id}
```

### 2. Environment Management API (6 endpoints)

#### 2.1 List Environments
```http
GET /api/environment/environments
```

#### 2.2 Create Environment
```http
POST /api/environment/environments
```
**Request Body:**
```json
{
  "name": "production",
  "environment_type": "production",
  "description": "Production environment",
  "auto_deployment_enabled": false
}
```

#### 2.3 Get Environment
```http
GET /api/environment/environments/{id}
```

#### 2.4 Update Environment
```http
PUT /api/environment/environments/{id}
```

#### 2.5 Delete Environment
```http
DELETE /api/environment/environments/{id}
```

#### 2.6 Environment Health Check
```http
GET /api/environment/environments/{id}/health
```

### 3. Security & Audit API (5 endpoints)

#### 3.1 Get User Permissions
```http
GET /api/environment/security/permissions
```

#### 3.2 Get Audit Trail
```http
GET /api/environment/security/audit
```
**Query Parameters:**
- `start_date`: Filter from date (ISO 8601)
- `end_date`: Filter to date (ISO 8601)
- `action_type`: Filter by action (create, update, delete, read)
- `classification_level`: Filter by security level
- `user_id`: Filter by specific user

**Response:**
```json
{
  "success": true,
  "audit_entries": [
    {
      "id": "audit-uuid",
      "organization_id": "org-uuid",
      "user_id": "user-uuid",
      "action_type": "update",
      "resource_type": "environment_variable",
      "resource_id": "var-uuid",
      "details": {
        "variable_key": "STRIPE_SECRET_KEY",
        "classification_level": 7,
        "changes": {
          "description": {
            "old": "Old description",
            "new": "New description"
          }
        }
      },
      "ip_address": "192.168.1.1",
      "user_agent": "Mozilla/5.0...",
      "timestamp": "2025-09-03T14:30:00Z"
    }
  ],
  "pagination": {
    "total": 1250,
    "limit": 100,
    "offset": 0
  }
}
```

#### 3.3 Generate Compliance Report
```http
POST /api/environment/security/compliance-report
```

#### 3.4 Classification Analysis
```http
GET /api/environment/security/classification-analysis
```

#### 3.5 Security Events
```http
GET /api/environment/security/events
```

### 4. Deployment Integration API (4 endpoints)

#### 4.1 Sync to GitHub Actions
```http
POST /api/environment/deployment/sync/github-actions
```
**Request Body:**
```json
{
  "environment_id": "env-uuid",
  "repository": "wedsync/wedsync-platform",
  "github_environment": "production",
  "secret_prefix": "WEDSYNC_",
  "sync_encrypted_only": true
}
```

#### 4.2 Deploy to Vercel
```http
POST /api/environment/deployment/deploy/vercel
```

#### 4.3 Generate Docker Configuration
```http
POST /api/environment/deployment/docker/generate
```

#### 4.4 Kubernetes Deployment
```http
POST /api/environment/deployment/kubernetes
```

### 5. Monitoring & Health API (4 endpoints)

#### 5.1 System Health
```http
GET /api/environment/health
```
**Response:**
```json
{
  "success": true,
  "overall_health": "healthy",
  "health_score": 98,
  "components": {
    "database": {
      "status": "healthy",
      "response_time_ms": 45,
      "connection_pool_usage": "65%"
    },
    "encryption_service": {
      "status": "healthy",
      "operations_per_second": 150
    },
    "monitoring_service": {
      "status": "healthy",
      "last_check": "2025-09-03T14:30:00Z"
    }
  },
  "wedding_day_status": {
    "is_wedding_day": false,
    "protection_active": false,
    "enhanced_monitoring": false
  }
}
```

#### 5.2 Performance Metrics
```http
GET /api/environment/monitoring/metrics
```

#### 5.3 Alert Status
```http
GET /api/environment/monitoring/alerts
```

#### 5.4 Analytics Dashboard
```http
GET /api/environment/monitoring/analytics
```

## Wedding Day Protection

### Emergency Override API

#### Enable Emergency Override
```http
POST /api/environment/wedding-safety/emergency-override
```
**Request Body:**
```json
{
  "action": "enable",
  "override_reason": "Payment system failure during active wedding",
  "emergency_contact_id": "contact-uuid",
  "severity_level": "P0",
  "estimated_duration_minutes": 30,
  "rollback_plan": "Detailed rollback procedure",
  "stakeholder_notification": true
}
```

#### Get Override Status
```http
GET /api/environment/wedding-safety/emergency-override
```

#### Emergency Rollback
```http
POST /api/environment/wedding-safety/emergency-rollback
```
**Request Body:**
```json
{
  "environment_id": "env-uuid",
  "rollback_reason": "Critical configuration error",
  "severity_level": "P0",
  "notify_stakeholders": true,
  "confirm_data_loss": true
}
```

## Error Responses

### Standard Error Format
```json
{
  "success": false,
  "error": "VALIDATION_ERROR",
  "message": "Classification level must be between 0 and 10",
  "details": {
    "field": "classification_level",
    "provided": 15,
    "allowed_range": "0-10"
  },
  "timestamp": "2025-09-03T14:30:00Z",
  "request_id": "req-uuid"
}
```

### Common Error Codes

| HTTP Status | Error Code | Description |
|-------------|------------|-------------|
| 400 | VALIDATION_ERROR | Request validation failed |
| 401 | AUTHENTICATION_REQUIRED | Missing or invalid authentication |
| 403 | INSUFFICIENT_PERMISSIONS | User lacks required permissions |
| 404 | RESOURCE_NOT_FOUND | Requested resource doesn't exist |
| 409 | RESOURCE_CONFLICT | Resource conflict (e.g., duplicate key) |
| 423 | RESOURCE_LOCKED | Resource locked (wedding day protection) |
| 429 | RATE_LIMIT_EXCEEDED | Too many requests |
| 500 | INTERNAL_ERROR | Server error |

### Wedding Day Specific Errors

```json
{
  "success": false,
  "error": "WEDDING_DAY_PROTECTION",
  "message": "Write operations blocked during wedding day",
  "details": {
    "is_wedding_day": true,
    "classification_level": 7,
    "emergency_override_required": true,
    "emergency_procedures": "/api/environment/wedding-safety/emergency-override"
  },
  "timestamp": "2025-06-01T14:30:00Z"
}
```

## Rate Limiting

### Standard Endpoints
- **Read Operations**: 1000 requests/hour
- **Write Operations**: 500 requests/hour
- **Health Checks**: 3600 requests/hour

### Emergency Endpoints
- **Emergency Override**: 3 requests/minute
- **Emergency Rollback**: 2 requests/minute

### Headers
Rate limit information in response headers:
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 995
X-RateLimit-Reset: 1641024000
```

## Webhooks

### Webhook Events

The system can send webhooks for various events:

#### Variable Events
- `variable.created`
- `variable.updated`
- `variable.deleted`
- `variable.value_changed`

#### Security Events
- `security.access_denied`
- `security.classification_violation`
- `security.emergency_override_activated`

#### Wedding Day Events
- `wedding_day.protection_activated`
- `wedding_day.emergency_triggered`
- `wedding_day.system_locked`

#### Example Webhook Payload
```json
{
  "event": "variable.updated",
  "timestamp": "2025-09-03T14:30:00Z",
  "organization_id": "org-uuid",
  "data": {
    "variable_id": "var-uuid",
    "key": "STRIPE_SECRET_KEY",
    "classification_level": 7,
    "user_id": "user-uuid",
    "changes": {
      "description": {
        "old": "Old description",
        "new": "New description"
      }
    }
  }
}
```

## SDK Examples

### JavaScript/TypeScript
```typescript
import { EnvironmentVariablesClient } from '@wedsync/env-client'

const client = new EnvironmentVariablesClient({
  baseUrl: 'https://api.wedsync.com',
  apiKey: 'your-api-key',
  organizationId: 'your-org-id'
})

// Create variable
const variable = await client.variables.create({
  key: 'NEW_API_KEY',
  description: 'New API key for service integration',
  classification_level: 7,
  variable_type: 'api_key'
})

// Set variable value
await client.variables.setValue(variable.id, {
  environment_id: 'prod-env-id',
  value: 'secret-value',
  encrypt: true
})
```

### Python
```python
from wedsync_env_client import EnvironmentVariablesClient

client = EnvironmentVariablesClient(
    base_url='https://api.wedsync.com',
    api_key='your-api-key',
    organization_id='your-org-id'
)

# Create variable
variable = client.variables.create(
    key='NEW_API_KEY',
    description='New API key for service integration',
    classification_level=7,
    variable_type='api_key'
)

# Set variable value
client.variables.set_value(
    variable_id=variable.id,
    environment_id='prod-env-id',
    value='secret-value',
    encrypt=True
)
```

## Testing

### Test Endpoints (Development Only)
```http
POST /api/environment/test/create-test-data
GET /api/environment/test/health
DELETE /api/environment/test/cleanup
```

### Test Authentication
Use test API keys in development:
```
WEDSYNC_TEST_API_KEY=test_key_development_only
```

---

## Support

- **API Issues**: developers@wedsync.com
- **Emergency Support**: emergency@wedsync.com
- **Documentation**: docs@wedsync.com

**Version**: 1.0.0  
**Last Updated**: September 3, 2025