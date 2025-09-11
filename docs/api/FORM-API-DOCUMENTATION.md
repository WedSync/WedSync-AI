# WedSync Form API Documentation

## Overview
The WedSync Form API provides comprehensive endpoints for creating, managing, and submitting wedding-related forms. All APIs are secured with authentication, rate limiting, and CSRF protection.

## Base URL
```
Production: https://api.wedsync.com
Development: http://localhost:3000
```

## Authentication
All protected endpoints require authentication via Bearer token:
```
Authorization: Bearer <auth_token>
```

State-changing operations require CSRF token:
```
X-CSRF-Token: <csrf_token>
```

## Rate Limits
- Form CRUD: 50 requests/minute
- Form Submission: 20 requests/minute (per IP)
- File Upload: 10 requests/minute

---

## 🔷 Form Management APIs

### Create Form
**POST** `/api/forms`

Creates a new form with fields and configuration.

**Headers:**
```json
{
  "Authorization": "Bearer <token>",
  "X-CSRF-Token": "<csrf_token>",
  "Content-Type": "application/json"
}
```

**Request Body:**
```json
{
  "title": "Wedding RSVP Form",
  "description": "Please confirm your attendance",
  "form_data": {
    "fields": [
      {
        "id": "field-1",
        "type": "text",
        "label": "Full Name",
        "required": true,
        "validation": {
          "required": true,
          "minLength": 2,
          "maxLength": 100
        }
      },
      {
        "id": "field-2",
        "type": "email",
        "label": "Email Address",
        "required": true
      },
      {
        "id": "field-3",
        "type": "select",
        "label": "Will you attend?",
        "options": [
          { "id": "yes", "label": "Yes", "value": "yes" },
          { "id": "no", "label": "No", "value": "no" }
        ]
      }
    ]
  },
  "settings": {
    "requireLogin": false,
    "allowMultipleSubmissions": false,
    "notificationEmail": "vendor@example.com",
    "successMessage": "Thank you for your submission!"
  },
  "status": "published",
  "is_published": true
}
```

**Response (201):**
```json
{
  "success": true,
  "form": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Wedding RSVP Form",
    "created_at": "2025-01-16T10:00:00Z",
    "status": "published"
  }
}
```

### Get Form
**GET** `/api/forms/{id}`

Retrieves a single form by ID.

**Query Parameters:**
- `public` (boolean): If true, returns public form data only

**Response (200):**
```json
{
  "form": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Wedding RSVP Form",
    "description": "Please confirm your attendance",
    "sections": [...],
    "settings": {...},
    "submission_count": 42
  }
}
```

### Update Form
**PUT** `/api/forms/{id}`

Updates an existing form.

**Headers:**
```json
{
  "Authorization": "Bearer <token>",
  "X-CSRF-Token": "<csrf_token>"
}
```

**Request Body:**
```json
{
  "title": "Updated Form Title",
  "description": "Updated description",
  "isPublished": true
}
```

**Response (200):**
```json
{
  "success": true,
  "form": {...},
  "message": "Form updated successfully"
}
```

### Delete Form
**DELETE** `/api/forms/{id}`

Deletes a form (only if no submissions exist).

**Headers:**
```json
{
  "Authorization": "Bearer <token>",
  "X-CSRF-Token": "<csrf_token>"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Form deleted successfully"
}
```

**Error Response (400):**
```json
{
  "error": "Cannot delete form with existing submissions",
  "message": "Archive the form instead to preserve submission data"
}
```

### List Forms
**GET** `/api/forms`

Lists all forms for the authenticated user.

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20, max: 100)
- `status` (string): Filter by status (draft, published, archived)
- `search` (string): Search in title/description

**Response (200):**
```json
{
  "forms": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Wedding RSVP Form",
      "status": "published",
      "created_at": "2025-01-16T10:00:00Z",
      "submission_count": 42
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

---

## 🔷 Form Submission APIs

### Submit Form
**POST** `/api/forms/{id}/submit`

Submits data to a published form.

**Headers:**
```json
{
  "Content-Type": "application/json",
  "X-CSRF-Token": "<csrf_token>" // Optional for public forms
}
```

**Request Body:**
```json
{
  "data": {
    "field-1": "John Doe",
    "field-2": "john@example.com",
    "field-3": "yes"
  },
  "sessionId": "session-123" // Optional
}
```

**Response (201):**
```json
{
  "success": true,
  "submissionId": "sub-550e8400-e29b-41d4",
  "message": "Thank you for your submission!",
  "submittedAt": "2025-01-16T10:30:00Z"
}
```

**Validation Error (400):**
```json
{
  "error": "Validation failed",
  "details": [
    "Full Name is required",
    "Email Address must be a valid email"
  ]
}
```

### Get Form for Submission
**GET** `/api/forms/{id}/submit`

Gets form structure for public submission.

**Response (200):**
```json
{
  "form": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Wedding RSVP Form",
    "description": "Please confirm your attendance",
    "settings": {
      "requireLogin": false,
      "submitButtonText": "Submit RSVP"
    },
    "sections": [...]
  },
  "canSubmit": true
}
```

---

## 🔷 Core Fields APIs

### Sync Core Fields
**POST** `/api/forms/{id}/sync-core-fields`

Maps form fields to core wedding fields for auto-population.

**Request Body:**
```json
{
  "autoDetect": true,
  "mappings": [
    {
      "formFieldId": "field-1",
      "coreFieldPath": "couple.partner1_name",
      "transformRule": "direct"
    },
    {
      "formFieldId": "field-2",
      "coreFieldPath": "couple.email",
      "transformRule": "direct"
    }
  ]
}
```

**Response (200):**
```json
{
  "success": true,
  "mappings": [...],
  "message": "Core fields synchronized successfully",
  "autoDetected": true
}
```

### Get Core Field Mappings
**GET** `/api/forms/{id}/sync-core-fields`

Retrieves current core field mappings for a form.

**Response (200):**
```json
{
  "formId": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Wedding RSVP Form",
  "hasCoreFields": true,
  "mappings": [...],
  "coreFieldsData": {...},
  "lastSynced": "2025-01-16T10:00:00Z"
}
```

### Update Core Fields from Submission
**PUT** `/api/forms/{id}/sync-core-fields`

Updates organization's core fields based on form submission.

**Request Body:**
```json
{
  "submissionId": "sub-550e8400",
  "submissionData": {
    "field-1": "Jane Smith",
    "field-2": "jane@example.com"
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "coreFields": {...},
  "message": "Core fields updated from submission"
}
```

---

## 🔷 File Upload API

### Upload File
**POST** `/api/forms/upload`

Uploads files associated with form submissions.

**Headers:**
```json
{
  "Authorization": "Bearer <token>",
  "X-CSRF-Token": "<csrf_token>"
}
```

**Request:** multipart/form-data
- `file`: File to upload (max 10MB)
- `formId`: Associated form ID

**Response (200):**
```json
{
  "success": true,
  "fileId": "file-123",
  "fileUrl": "https://storage.wedsync.com/uploads/file-123.pdf",
  "uploadTime": 342
}
```

---

## 🔷 Field Types

### Supported Field Types
- `text` - Single line text input
- `textarea` - Multi-line text input
- `email` - Email address with validation
- `tel` - Phone number with format validation
- `number` - Numeric input with min/max
- `date` - Date picker
- `time` - Time selector
- `select` - Dropdown selection
- `radio` - Radio button group
- `checkbox` - Multiple checkboxes
- `file` - File upload

### Field Validation Rules
```json
{
  "required": true,
  "minLength": 2,
  "maxLength": 100,
  "min": 0,
  "max": 100,
  "pattern": "^[A-Za-z]+$",
  "email": true,
  "url": true
}
```

---

## 🔷 Error Responses

### Standard Error Format
```json
{
  "error": "Error message",
  "details": [...],
  "requestId": "req-123",
  "timestamp": "2025-01-16T10:00:00Z"
}
```

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized
- `403` - Forbidden (CSRF or permission denied)
- `404` - Not Found
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error

---

## 🔷 Security Features

### Input Sanitization
All text inputs are sanitized using DOMPurify to prevent XSS attacks.

### CSRF Protection
State-changing operations require valid CSRF tokens.

### Rate Limiting
```
Form CRUD: 50 req/min
Submissions: 20 req/min per IP
Validation: 50 req/min
File Upload: 10 req/min
```

### SQL Injection Prevention
All database queries use parameterized statements via Supabase.

### File Upload Security
- Max size: 10MB
- Allowed types: Images (JPEG, PNG, GIF, WebP), PDF, Word documents
- Virus scanning on upload

---

## 🔷 Testing

### Test Endpoints
```bash
# Test form creation
curl -X POST http://localhost:3000/api/forms \
  -H "Authorization: Bearer <token>" \
  -H "X-CSRF-Token: <csrf>" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Form",...}'

# Test form submission
curl -X POST http://localhost:3000/api/forms/{id}/submit \
  -H "Content-Type: application/json" \
  -d '{"data":{"field-1":"value"}}'
```

### Performance Benchmarks
- P95 Response Time: <200ms
- Concurrent Users: 100+
- Throughput: 1000+ requests/minute

---

## 🔷 Webhooks

### Submission Webhook
When configured, sends POST request on form submission:

```json
{
  "event": "form.submitted",
  "formId": "550e8400-e29b-41d4-a716-446655440000",
  "submissionId": "sub-123",
  "data": {...},
  "timestamp": "2025-01-16T10:00:00Z"
}
```

---

## 🔷 Migration Guide

### From v1 to v2
1. Update field structure from `sections` to `form_data.fields`
2. Replace `validation.isRequired` with `validation.required`
3. Update CSRF token header from `csrf-token` to `X-CSRF-Token`

---

## Support

For API support, contact:
- Email: api-support@wedsync.com
- Documentation: https://docs.wedsync.com/api
- Status Page: https://status.wedsync.com

---

*Last Updated: January 16, 2025*
*API Version: 2.0*