# Budget Export API Documentation
**WS-166 Budget Export System - Developer Reference**

## Overview

The Budget Export API provides secure, authenticated endpoints for generating and delivering wedding budget reports in multiple formats. All endpoints implement comprehensive input validation, authentication checks, and audit logging as per WedSync security standards.

## Base URL

```
Production: https://api.wedsync.com/v1
Staging: https://staging-api.wedsync.com/v1
Development: http://localhost:3000/api
```

## Authentication

All budget export endpoints require authentication via Bearer token or session-based authentication.

### Header Requirements
```http
Authorization: Bearer {jwt_token}
Content-Type: application/json
X-Client-Version: 2.0.0
```

### Session Authentication
```http
Cookie: session_token={session_value}
X-CSRF-Token: {csrf_token}
```

## Security Implementation

All endpoints follow WedSync security standards:

```typescript
// Required security middleware pattern
import { withSecureValidation } from '@/lib/validation/middleware';
import { getServerSession } from 'next-auth';
import { rateLimitService } from '@/lib/rate-limiter';

export const POST = withSecureValidation(schema, handler);
```

### Rate Limiting
- **Authenticated Users**: 10 exports per minute, 100 per hour
- **Premium Users**: 20 exports per minute, 200 per hour
- **IP-based limiting**: 5 requests per minute for unauthenticated requests

## API Endpoints

### 1. PDF Export

#### `POST /api/budget/export/pdf`

Generates a professionally formatted PDF report suitable for presentations and formal documentation.

**Request Schema:**
```typescript
interface PDFExportRequest {
  budgetId: string;                    // Required: Budget identifier
  filters?: {
    dateRange?: {
      startDate: string;              // ISO 8601 format
      endDate: string;
    };
    categories?: string[];            // Array of category names
    vendors?: string[];              // Array of vendor IDs
    amountRange?: {
      min: number;                   // Minimum amount filter
      max: number;                   // Maximum amount filter
    };
    paymentStatus?: ('paid' | 'pending' | 'planned')[];
  };
  options?: {
    includeCharts: boolean;          // Default: true
    includeTimeline: boolean;        // Default: false
    includePhotos: boolean;          // Default: false
    privacyLevel: 'full' | 'family' | 'vendor' | 'public'; // Default: 'full'
    paperSize: 'letter' | 'a4';     // Default: 'letter'
    orientation: 'portrait' | 'landscape'; // Default: 'portrait'
  };
}
```

**Example Request:**
```bash
curl -X POST https://api.wedsync.com/v1/api/budget/export/pdf \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "budgetId": "budget_abc123",
    "filters": {
      "categories": ["Venue & Reception", "Catering & Bar"],
      "dateRange": {
        "startDate": "2024-01-01",
        "endDate": "2024-12-31"
      }
    },
    "options": {
      "includeCharts": true,
      "privacyLevel": "family",
      "paperSize": "letter"
    }
  }'
```

**Response (Success - 200):**
```http
HTTP/1.1 200 OK
Content-Type: application/pdf
Content-Disposition: attachment; filename="wedding-budget-2024.pdf"
Content-Length: 245760
X-Export-ID: exp_def456
X-Generation-Time: 1.2s

[PDF binary content]
```

**Response (Async Processing - 202):**
For large budgets that require background processing:
```json
{
  "exportId": "exp_def456",
  "status": "processing",
  "estimatedCompletion": "2024-01-20T10:35:00Z",
  "statusUrl": "/api/budget/export/status/exp_def456",
  "webhookUrl": "https://api.wedsync.com/v1/webhooks/export-complete"
}
```

### 2. CSV Export

#### `POST /api/budget/export/csv`

Generates comma-separated values file for data import and analysis.

**Request Schema:**
```typescript
interface CSVExportRequest {
  budgetId: string;
  filters?: ExportFilters;           // Same as PDF filters
  options?: {
    encoding: 'utf-8' | 'iso-8859-1'; // Default: 'utf-8'
    delimiter: ',' | ';' | '\t';     // Default: ','
    includeHeaders: boolean;         // Default: true
    dateFormat: 'iso' | 'us' | 'eu'; // Default: 'iso'
    currencyFormat: 'symbol' | 'code' | 'none'; // Default: 'symbol'
  };
}
```

**Example Request:**
```bash
curl -X POST https://api.wedsync.com/v1/api/budget/export/csv \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "budgetId": "budget_abc123",
    "options": {
      "encoding": "utf-8",
      "delimiter": ",",
      "dateFormat": "us",
      "currencyFormat": "symbol"
    }
  }'
```

**Response (Success - 200):**
```http
HTTP/1.1 200 OK
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename="wedding-budget-export.csv"
Content-Length: 15420

category,item,planned_cost,actual_cost,difference,vendor,payment_status,due_date
"Venue & Reception","Wedding Venue Rental","$12,000.00","$11,800.00","-$200.00","Premier Venues Co","paid","2024-12-01"
"Catering & Bar","Wedding Dinner Service","$8,500.50","$8,750.25","$249.75","Elegant Catering","pending","2024-11-15"
```

### 3. Excel Export

#### `POST /api/budget/export/excel`

Generates Microsoft Excel (.xlsx) workbook with multiple worksheets and formulas.

**Request Schema:**
```typescript
interface ExcelExportRequest {
  budgetId: string;
  filters?: ExportFilters;
  options?: {
    includeFormulas: boolean;        // Default: true
    includeCharts: boolean;          // Default: true
    includeConditionalFormatting: boolean; // Default: true
    worksheets: {
      summary: boolean;              // Default: true
      categories: boolean;           // Default: true
      vendors: boolean;              // Default: true
      timeline: boolean;             // Default: false
      comparisons: boolean;          // Default: false
    };
    excelVersion: '2016' | '2019' | '365'; // Default: '2019'
  };
}
```

**Example Request:**
```bash
curl -X POST https://api.wedsync.com/v1/api/budget/export/excel \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "budgetId": "budget_abc123",
    "options": {
      "includeCharts": true,
      "includeFormulas": true,
      "worksheets": {
        "summary": true,
        "categories": true,
        "vendors": true,
        "timeline": true
      }
    }
  }'
```

**Response (Success - 200):**
```http
HTTP/1.1 200 OK
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename="wedding-budget-workbook.xlsx"
Content-Length: 98304

[Excel binary content]
```

### 4. Export Status Check

#### `GET /api/budget/export/status/{exportId}`

Checks the status of an asynchronous export operation.

**Example Request:**
```bash
curl -X GET https://api.wedsync.com/v1/api/budget/export/status/exp_def456 \
  -H "Authorization: Bearer {token}"
```

**Response (Processing - 200):**
```json
{
  "exportId": "exp_def456",
  "status": "processing",
  "progress": 65,
  "estimatedCompletion": "2024-01-20T10:35:00Z",
  "createdAt": "2024-01-20T10:30:00Z",
  "format": "pdf"
}
```

**Response (Completed - 200):**
```json
{
  "exportId": "exp_def456",
  "status": "completed",
  "progress": 100,
  "downloadUrl": "https://exports.wedsync.com/temp/exp_def456.pdf",
  "expiresAt": "2024-01-21T10:30:00Z",
  "fileSize": 245760,
  "completedAt": "2024-01-20T10:32:15Z"
}
```

### 5. Batch Export

#### `POST /api/budget/export/batch`

Generates multiple export formats simultaneously.

**Request Schema:**
```typescript
interface BatchExportRequest {
  budgetId: string;
  formats: ('pdf' | 'csv' | 'excel')[];
  filters?: ExportFilters;
  options?: {
    pdf?: PDFExportOptions;
    csv?: CSVExportOptions;
    excel?: ExcelExportOptions;
  };
}
```

**Response (202):**
```json
{
  "batchId": "batch_ghi789",
  "exports": [
    {
      "exportId": "exp_pdf123",
      "format": "pdf",
      "status": "processing"
    },
    {
      "exportId": "exp_csv456", 
      "format": "csv",
      "status": "processing"
    },
    {
      "exportId": "exp_excel789",
      "format": "excel", 
      "status": "processing"
    }
  ],
  "statusUrl": "/api/budget/export/batch/status/batch_ghi789"
}
```

## Error Responses

All endpoints follow consistent error response format:

### 400 Bad Request
```json
{
  "error": "validation_failed",
  "message": "Request validation failed",
  "details": [
    {
      "field": "budgetId",
      "code": "required",
      "message": "Budget ID is required"
    }
  ],
  "requestId": "req_123abc"
}
```

### 401 Unauthorized
```json
{
  "error": "unauthorized",
  "message": "Authentication required",
  "requestId": "req_123abc"
}
```

### 403 Forbidden
```json
{
  "error": "forbidden",
  "message": "User does not have access to this budget",
  "requestId": "req_123abc"
}
```

### 404 Not Found
```json
{
  "error": "not_found",
  "message": "Budget not found",
  "requestId": "req_123abc"
}
```

### 429 Rate Limited
```json
{
  "error": "rate_limited",
  "message": "Export rate limit exceeded",
  "retryAfter": 60,
  "limit": 10,
  "remaining": 0,
  "requestId": "req_123abc"
}
```

### 500 Internal Server Error
```json
{
  "error": "internal_error",
  "message": "An unexpected error occurred",
  "requestId": "req_123abc"
}
```

## Data Models

### Budget Model
```typescript
interface Budget {
  id: string;
  userId: string;
  weddingDate: string;
  totalBudget: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
  items: BudgetItem[];
}
```

### Budget Item Model
```typescript
interface BudgetItem {
  id: string;
  budgetId: string;
  category: string;
  subcategory?: string;
  name: string;
  description?: string;
  plannedCost: number;
  actualCost: number;
  vendor?: {
    id: string;
    name: string;
    contactEmail?: string;
    contactPhone?: string;
  };
  paymentStatus: 'paid' | 'pending' | 'planned';
  paymentDueDate?: string;
  contractDate?: string;
  notes?: string;
  attachments?: string[];
  createdAt: string;
  updatedAt: string;
}
```

### Export Filters
```typescript
interface ExportFilters {
  dateRange?: {
    startDate: string;
    endDate: string;
  };
  categories?: string[];
  vendors?: string[];
  amountRange?: {
    min: number;
    max: number;
  };
  paymentStatus?: ('paid' | 'pending' | 'planned')[];
  contractStatus?: ('signed' | 'pending' | 'negotiating')[];
}
```

## Webhooks

### Export Completion Webhook

When an asynchronous export completes, a webhook notification is sent:

**POST to configured webhook URL:**
```json
{
  "event": "export.completed",
  "exportId": "exp_def456",
  "budgetId": "budget_abc123",
  "userId": "user_xyz789",
  "format": "pdf",
  "status": "completed",
  "downloadUrl": "https://exports.wedsync.com/temp/exp_def456.pdf",
  "expiresAt": "2024-01-21T10:30:00Z",
  "fileSize": 245760,
  "metadata": {
    "filters": { /* applied filters */ },
    "options": { /* export options */ }
  },
  "timestamp": "2024-01-20T10:32:15Z"
}
```

### Webhook Signature Verification
```typescript
// Verify webhook authenticity
import crypto from 'crypto';

function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}
```

## SDK Examples

### JavaScript/TypeScript SDK

```typescript
import { WedSyncAPI } from '@wedsync/api-client';

const api = new WedSyncAPI({
  apiKey: process.env.WEDSYNC_API_KEY,
  environment: 'production' // or 'staging', 'development'
});

// Export PDF
const pdfExport = await api.budget.exportPDF({
  budgetId: 'budget_abc123',
  filters: {
    categories: ['Venue & Reception', 'Catering & Bar']
  },
  options: {
    includeCharts: true,
    privacyLevel: 'family'
  }
});

// Export CSV
const csvExport = await api.budget.exportCSV({
  budgetId: 'budget_abc123',
  options: {
    encoding: 'utf-8',
    currencyFormat: 'symbol'
  }
});

// Batch export
const batchExport = await api.budget.exportBatch({
  budgetId: 'budget_abc123',
  formats: ['pdf', 'csv', 'excel'],
  filters: {
    dateRange: {
      startDate: '2024-01-01',
      endDate: '2024-12-31'
    }
  }
});

// Check export status
const status = await api.budget.getExportStatus('exp_def456');
```

### Python SDK

```python
from wedsync import WedSyncClient

client = WedSyncClient(
    api_key=os.environ['WEDSYNC_API_KEY'],
    environment='production'
)

# Export PDF
pdf_export = client.budget.export_pdf(
    budget_id='budget_abc123',
    filters={
        'categories': ['Venue & Reception', 'Catering & Bar']
    },
    options={
        'include_charts': True,
        'privacy_level': 'family'
    }
)

# Export CSV
csv_export = client.budget.export_csv(
    budget_id='budget_abc123',
    options={
        'encoding': 'utf-8',
        'currency_format': 'symbol'
    }
)
```

## Performance Considerations

### File Size Limits
- **PDF**: Maximum 10MB per export
- **CSV**: Maximum 50MB per export  
- **Excel**: Maximum 25MB per export

### Processing Times
- **Small budgets** (<50 items): <2 seconds
- **Medium budgets** (50-200 items): 2-15 seconds
- **Large budgets** (200+ items): 15-60 seconds (async processing)

### Caching Strategy
- Export results cached for 1 hour
- Identical requests return cached results
- Cache invalidated on budget updates

## Testing

### Test Environment
```
Base URL: https://staging-api.wedsync.com/v1
API Key: test_key_123abc (for staging)
```

### Sample Test Data
```bash
# Create test budget
curl -X POST https://staging-api.wedsync.com/v1/api/budget \
  -H "Authorization: Bearer test_key_123abc" \
  -d @test-budget.json

# Test PDF export
curl -X POST https://staging-api.wedsync.com/v1/api/budget/export/pdf \
  -H "Authorization: Bearer test_key_123abc" \
  -d '{
    "budgetId": "test_budget_001",
    "filters": {"categories": ["Venue & Reception"]}
  }' \
  --output test-export.pdf
```

## Security Best Practices

### Input Validation
```typescript
// All endpoints use Zod validation
import { z } from 'zod';
import { secureStringSchema } from '@/lib/validation/schemas';

const exportRequestSchema = z.object({
  budgetId: secureStringSchema.regex(/^budget_[a-zA-Z0-9]+$/),
  filters: z.object({
    categories: z.array(secureStringSchema).max(50).optional(),
    dateRange: z.object({
      startDate: z.string().datetime(),
      endDate: z.string().datetime()
    }).optional()
  }).optional()
});
```

### Data Sanitization
```typescript
// All user input sanitized before export generation
import DOMPurify from 'dompurify';

function sanitizeForExport(data: any): any {
  return {
    ...data,
    name: DOMPurify.sanitize(data.name),
    description: DOMPurify.sanitize(data.description),
    notes: DOMPurify.sanitize(data.notes)
  };
}
```

### File Security
- All export files stored in temporary, secure locations
- Download URLs expire after 24 hours
- Files automatically deleted after expiration
- Content-Security-Policy headers prevent XSS

## Monitoring & Analytics

### Export Metrics
- Export success rate by format
- Average generation time by budget size
- Error rate by endpoint
- Peak usage patterns

### Audit Logging
All export operations logged with:
- User ID and budget ID
- Export format and options used
- Processing time and file size
- IP address and user agent
- Success/failure status

### Alerting
- High error rates (>5%)
- Slow processing times (>30s average)
- Rate limit violations
- Security incidents

---

**API Version**: 2.0.0  
**Last Updated**: January 2025  
**Support**: developers@wedsync.com