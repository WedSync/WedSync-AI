# WedSync API Routes Structure Documentation

## Overview

The WedSync API provides comprehensive endpoints for wedding suppliers to manage clients, bookings, forms, and integrations. Our RESTful API is designed specifically for the wedding industry with built-in support for seasonal patterns, vendor types, and wedding-specific business logic.

## Base URL

```
Production: https://api.wedsync.com/v1
Staging: https://staging-api.wedsync.com/v1
Development: http://localhost:3000/api
```

## Wedding Industry Context

WedSync APIs are optimized for wedding industry workflows:

- **Seasonal Patterns**: Peak wedding season (May-September) handling with intelligent caching
- **Vendor Types**: Specialized endpoints for photographers, venues, caterers, planners, florists
- **Wedding Timeline**: Date-aware APIs that understand wedding planning phases
- **Guest Management**: Support for guest counts, dietary restrictions, and seating arrangements
- **Multi-Stakeholder**: APIs designed for suppliers, couples, and venue managers

## Response Format

All API responses follow a consistent format:

```json
{
  "success": boolean,
  "data": object | array | null,
  "error": {
    "code": string,
    "message": string,
    "details": object
  },
  "meta": {
    "requestId": string,
    "timestamp": string,
    "version": string,
    "pagination": object // for paginated responses
  }
}
```

## Authentication

WedSync API uses JWT (JSON Web Tokens) for authentication. All API requests must include a valid JWT token in the Authorization header.

```
Authorization: Bearer YOUR_JWT_TOKEN
```

### Token Scopes

- **Supplier Tokens**: Access to own supplier data and clients
- **Couple Tokens**: Access to own wedding data and booked suppliers
- **Admin Tokens**: Full system access (WedSync team only)

## Rate Limiting

API requests are rate limited based on your subscription tier:

- **Basic**: 100 requests per 15 minutes
- **Premium**: 500 requests per 15 minutes  
- **Unlimited**: 10,000 requests per 15 minutes

Rate limit headers are included in all responses:
- `X-RateLimit-Remaining`: Requests remaining in current window
- `X-RateLimit-Reset`: Unix timestamp when limit resets
- `Retry-After`: Seconds to wait if rate limited

## Core API Routes

### Supplier Management

#### Get Supplier Profile
```
GET /api/suppliers/{id}
```

Retrieves detailed supplier information including business details, service offerings, and wedding specializations.

**Parameters:**
- `id` (string, required): Supplier UUID

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Yorkshire Wedding Photography",
    "type": "photographer",
    "location": "Yorkshire, UK",
    "specializations": ["outdoor", "romantic", "documentary"],
    "wedding_seasons_active": ["spring", "summer", "autumn"],
    "package_tiers": ["basic", "premium", "luxury"],
    "average_guest_count": 120,
    "typical_venues": ["countryside", "historic", "outdoor"]
  }
}
```

### Client Management

#### List Supplier Clients
```
GET /api/suppliers/{id}/clients
```

Retrieves paginated list of clients with wedding-specific filtering and business context.

**Parameters:**
- `id` (string, required): Supplier UUID
- `page` (integer, optional): Page number (default: 1)
- `limit` (integer, optional): Items per page (default: 20, max: 100)
- `status` (string, optional): Filter by status (active, pending, completed, cancelled)
- `wedding_date_from` (datetime, optional): Filter weddings from this date
- `wedding_date_to` (datetime, optional): Filter weddings to this date
- `wedding_season` (string, optional): Filter by season (spring, summer, autumn, winter)
- `budget_range` (string, optional): Filter by budget (under_1000, 1000_2500, 2500_5000, 5000_plus)
- `search` (string, optional): Search couple names or venue names

**Wedding Industry Response Fields:**
Each client includes calculated wedding industry fields:
- `days_until_wedding`: Days remaining until wedding date
- `wedding_season`: Calculated season based on wedding date
- `is_peak_season`: Boolean indicating if during peak wedding season
- `planning_status`: Current planning phase (early_planning, active_planning, etc.)
- `urgency_level`: Urgency based on days remaining (low, medium, high, critical)
- `estimated_revenue`: Calculated based on budget range and package tier

**Example Response:**
```json
{
  "success": true,
  "data": {
    "clients": [
      {
        "id": "client-uuid",
        "couple_name": "John & Jane Smith",
        "wedding_date": "2025-06-15T14:00:00Z",
        "venue_name": "Yorkshire Dales Manor",
        "guest_count": 120,
        "budget_range": "2500_5000",
        "budget_display": "£2,500 - £5,000",
        "status": "active",
        "days_until_wedding": 180,
        "wedding_season": "summer",
        "is_peak_season": true,
        "planning_status": "active_planning",
        "urgency_level": "medium",
        "estimated_revenue": 3500
      }
    ],
    "summary": {
      "total_clients": 45,
      "upcoming_weddings": 12,
      "peak_season_weddings": 8,
      "high_value_clients": 5,
      "total_estimated_revenue": 125000
    }
  },
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "totalPages": 3,
      "hasNextPage": true,
      "hasPreviousPage": false
    }
  }
}
```

#### Create New Client
```
POST /api/suppliers/{id}/clients
```

Creates a new client with wedding details and automatic industry calculations.

**Request Body:**
```json
{
  "couple_name": "Mark & Sarah Johnson",
  "wedding_date": "2025-08-20T15:00:00Z",
  "venue_name": "Lake District Resort",
  "venue_location": "Windermere, Cumbria",
  "guest_count": 80,
  "budget_range": "1000_2500",
  "contact_email": "marksarah@example.com",
  "contact_phone": "+44 7123 456789",
  "preferred_style": "romantic",
  "package_tier": "standard",
  "special_requests": "Outdoor ceremony with golden hour photos"
}
```

### Form Management

#### Create Dynamic Wedding Form
```
POST /api/forms
```

Creates a new dynamic form for collecting wedding information from couples.

**Request Body:**
```json
{
  "title": "Wedding Photography Questionnaire",
  "form_type": "client_intake",
  "supplier_id": "supplier-uuid",
  "fields": [
    {
      "name": "preferred_style",
      "type": "select",
      "label": "Preferred Photography Style",
      "options": ["romantic", "modern", "classic", "artistic"],
      "required": true,
      "validation": {
        "min": 1,
        "max": 1
      }
    },
    {
      "name": "special_moments",
      "type": "textarea", 
      "label": "Special Moments to Capture",
      "placeholder": "Describe any special moments, traditions, or must-have shots",
      "required": false,
      "validation": {
        "maxLength": 1000
      }
    }
  ],
  "wedding_context": {
    "applicable_seasons": ["spring", "summer", "autumn"],
    "venue_types": ["outdoor", "indoor", "mixed"],
    "guest_count_ranges": [
      {"min": 1, "max": 50, "label": "Intimate"},
      {"min": 51, "max": 150, "label": "Medium"},
      {"min": 151, "max": 500, "label": "Large"}
    ]
  }
}
```

### Webhook Management

#### Register Webhook Endpoint
```
POST /api/webhooks
```

Registers a webhook endpoint to receive real-time notifications about wedding events.

**Wedding Event Types:**
- `booking.created`: New wedding booking confirmed
- `booking.updated`: Booking details changed
- `booking.cancelled`: Wedding booking cancelled
- `payment.received`: Payment processed successfully
- `form.submitted`: Client form submission received
- `availability.changed`: Supplier availability updated
- `review.received`: New review from couple

**Request Body:**
```json
{
  "endpoint_url": "https://your-app.com/webhooks/wedsync",
  "event_types": ["booking.created", "payment.received"],
  "secret": "your-webhook-secret-key",
  "retry_policy": {
    "max_attempts": 5,
    "backoff_strategy": "exponential",
    "initial_delay_seconds": 60
  }
}
```

### Mobile API Endpoints

#### Mobile-Optimized Client List
```
GET /api/suppliers/{id}/clients/mobile
```

Returns client data optimized for mobile devices with reduced payload sizes and mobile-specific context.

**Mobile Headers:**
Include these headers for optimal mobile experience:
- `X-Connection-Type`: Connection type (4g, 3g, 2g, wifi)
- `X-Device-Type`: Device type (mobile, tablet)  
- `X-Battery-Level`: Battery percentage (0-100)
- `X-Low-Power-Mode`: true/false
- `X-Viewport`: Screen dimensions (width x height)

**Mobile Optimizations Applied:**
- Image URLs include size and quality parameters
- Reduced field sets for slower connections
- Compressed response format
- Offline-compatible data structure

## Error Handling

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Wedding date must be in the future",
    "details": {
      "validationErrors": [
        {
          "path": ["wedding_date"],
          "message": "Wedding date must be in the future",
          "received": "2020-01-01T12:00:00Z"
        }
      ]
    }
  },
  "meta": {
    "requestId": "req-uuid",
    "timestamp": "2025-01-20T10:30:00Z",
    "version": "v1"
  }
}
```

### Common Error Codes

#### Authentication Errors
- `UNAUTHORIZED`: No token provided or invalid token
- `FORBIDDEN`: Valid token but insufficient permissions  
- `TOKEN_EXPIRED`: JWT token has expired
- `INVALID_SCOPE`: Token doesn't have required scope
- `EMAIL_VERIFICATION_REQUIRED`: Email verification needed

#### Validation Errors
- `VALIDATION_ERROR`: Input validation failed
- `WEDDING_DATE_INVALID`: Wedding date validation failed
- `GUEST_COUNT_INVALID`: Guest count outside valid range
- `BUDGET_RANGE_INVALID`: Invalid budget range specified
- `VENUE_CAPACITY_EXCEEDED`: Guest count exceeds venue capacity

#### Business Logic Errors
- `SUPPLIER_UNAVAILABLE`: Supplier already booked for date
- `WEDDING_DATE_IMMUTABLE`: Confirmed wedding date cannot be changed
- `PAYMENT_PACKAGE_MISMATCH`: Payment amount doesn't match package
- `RATE_LIMIT_EXCEEDED`: API rate limit exceeded

#### System Errors
- `INTERNAL_SERVER_ERROR`: Unexpected server error
- `SERVICE_UNAVAILABLE`: Service temporarily unavailable
- `MAINTENANCE_MODE`: System under maintenance

## Wedding Season Considerations

### Peak Season Handling (May-September)
During peak wedding season, the API implements special handling:

- **Increased Rate Limits**: Higher rate limits for premium users
- **Priority Processing**: Wedding-day requests get priority
- **Caching Strategy**: Extended caching for frequently accessed data
- **Load Balancing**: Automatic scaling based on wedding season patterns

### Wedding Day Protocol
When a wedding is happening (detected by `wedding_date` being today):

- **Zero Downtime**: Guaranteed 100% uptime
- **Fast Response**: All API calls under 200ms
- **Priority Support**: Immediate escalation for issues
- **Enhanced Monitoring**: Real-time system health checks

### Seasonal Data Fields
Many endpoints include seasonal context:

```json
{
  "wedding_season": "summer",
  "is_peak_season": true,
  "seasonal_pricing": "peak",
  "weather_considerations": "outdoor_friendly",
  "booking_demand": "high"
}
```

## Performance Optimization

### Response Times
- **Simple queries**: < 100ms
- **Complex filtering**: < 300ms  
- **Data creation**: < 200ms
- **Mobile endpoints**: < 150ms

### Caching Strategy
- **Client lists**: 5 minutes
- **Supplier profiles**: 1 hour
- **Static data**: 24 hours
- **Wedding day data**: No caching

### Pagination
All list endpoints support pagination:

```json
{
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 156,
      "totalPages": 8,
      "hasNextPage": true,
      "hasPreviousPage": false
    }
  }
}
```

## Security Features

### Input Validation
- All input is validated and sanitized
- Wedding dates must be in the future
- Guest counts have reasonable limits (1-500)
- Budget ranges use predefined enums
- Email addresses are validated

### Data Protection
- Sensitive data is encrypted in transit and at rest
- Personal information follows GDPR requirements
- Payment data is PCI compliant
- Audit logs track all data access

### GDPR Compliance
Special endpoints for GDPR compliance:

```
GET /api/suppliers/{id}/data-export    # Article 20 - Data portability
DELETE /api/suppliers/{id}/data        # Article 17 - Right to erasure
```

## Integration Examples

### JavaScript/Node.js
```javascript
const response = await fetch('https://api.wedsync.com/v1/suppliers/me/clients', {
  headers: {
    'Authorization': 'Bearer ' + YOUR_JWT_TOKEN,
    'Content-Type': 'application/json'
  }
});

const data = await response.json();
if (data.success) {
  console.log(`Found ${data.data.clients.length} clients`);
}
```

### cURL
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     https://api.wedsync.com/v1/suppliers/me/clients
```

### Python
```python
import requests

headers = {
    'Authorization': f'Bearer {YOUR_JWT_TOKEN}',
    'Content-Type': 'application/json'
}

response = requests.get(
    'https://api.wedsync.com/v1/suppliers/me/clients',
    headers=headers
)

data = response.json()
```

## Webhook Integration

### Webhook Payload Format
```json
{
  "event_type": "booking.created",
  "event_id": "evt_uuid",
  "timestamp": "2025-01-20T10:30:00Z",
  "data": {
    "booking_id": "booking_uuid",
    "supplier_id": "supplier_uuid",
    "couple_name": "John & Jane Smith",
    "wedding_date": "2025-06-15T14:00:00Z",
    "total_amount": 2500,
    "status": "confirmed"
  },
  "wedding_context": {
    "days_until_wedding": 146,
    "wedding_season": "summer",
    "is_peak_season": true
  }
}
```

### Webhook Security
- All webhooks include HMAC signatures
- Retry logic with exponential backoff
- Webhook endpoints must respond with 2xx status
- Failed webhooks are retried up to 5 times

## Testing the API

### Test Endpoints
```
GET /api/health          # System health check
GET /api/version         # API version info
POST /api/test/webhook   # Test webhook delivery
```

### Sample Test Data
The API provides test data for development:
- Test suppliers with various specializations
- Sample weddings across all seasons
- Mock client data with realistic wedding details

## Support and Documentation

- **API Documentation**: https://docs.wedsync.com/api
- **Interactive API Explorer**: https://api.wedsync.com/explorer
- **Status Page**: https://status.wedsync.com
- **Support**: api-support@wedsync.com

## Changelog

### v1.2.0 (2025-01-20)
- Added mobile-optimized endpoints
- Enhanced wedding season handling
- Improved error messages
- Added GDPR compliance endpoints

### v1.1.0 (2024-12-15)
- Added webhook retry policies
- Enhanced security validation
- Improved performance monitoring
- Added seasonal data fields

### v1.0.0 (2024-11-01)
- Initial API release
- Core supplier and client management
- Basic webhook support
- Authentication and authorization