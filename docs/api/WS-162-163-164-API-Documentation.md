# WS-162, WS-163, WS-164 Backend API Documentation

## Overview

This documentation covers the backend APIs implemented for:
- **WS-162**: Helper Schedules API
- **WS-163**: Budget Categories API  
- **WS-164**: Manual Budget Tracking API
- **File Upload System**: Receipt management for expenses

## Table of Contents

1. [Authentication](#authentication)
2. [Helper Schedules API (WS-162)](#helper-schedules-api-ws-162)
3. [Budget Categories API (WS-163)](#budget-categories-api-ws-163)
4. [Expenses API (WS-164)](#expenses-api-ws-164)
5. [Receipt Upload API](#receipt-upload-api)
6. [Error Handling](#error-handling)
7. [Data Models](#data-models)
8. [Security Considerations](#security-considerations)

## Authentication

All API endpoints require authentication using Supabase Auth. Include the session cookie or Authorization header in requests.

### Authentication Headers
```
Cookie: sb-access-token=<token>; sb-refresh-token=<refresh-token>
# OR
Authorization: Bearer <access-token>
```

### User Roles
- **Wedding Owner**: User who created the wedding (user1_id or user2_id)
- **Helper**: User assigned to help with wedding tasks
- **Any**: Either wedding owner or helper

---

## Helper Schedules API (WS-162)

Manage helper assignments and task scheduling for weddings.

### Base URL
```
/api/helpers/schedules
```

### GET /api/helpers/schedules

Retrieve helper assignments for a wedding.

#### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| wedding_id | UUID | Yes | Wedding ID |
| helper_id | UUID | No | Filter by specific helper |
| status | String | No | Filter by status (pending, accepted, in_progress, completed, declined, cancelled) |
| category | String | No | Filter by category |
| limit | Integer | No | Results limit (default: 50) |
| offset | Integer | No | Results offset (default: 0) |

#### Response
```json
{
  "assignments": [
    {
      "id": "uuid",
      "wedding_id": "uuid",
      "helper_id": "uuid",
      "assigned_by_id": "uuid",
      "title": "Photography Setup",
      "description": "Set up photography equipment before ceremony",
      "category": "photography",
      "priority": "high",
      "status": "pending",
      "due_date": "2024-06-15T10:00:00Z",
      "estimated_hours": 4,
      "actual_hours": null,
      "location": "Wedding Venue",
      "requirements": "Professional camera equipment",
      "special_instructions": "Arrive 30 minutes early",
      "accepted_at": null,
      "started_at": null,
      "completed_at": null,
      "notes": null,
      "created_at": "2024-01-15T10:00:00Z",
      "updated_at": "2024-01-15T10:00:00Z",
      "helper": {
        "id": "uuid",
        "full_name": "John Helper",
        "email": "helper@example.com",
        "avatar_url": "https://example.com/avatar.jpg"
      },
      "assigned_by": {
        "id": "uuid",
        "full_name": "Wedding Owner",
        "email": "owner@example.com"
      }
    }
  ],
  "summary": {
    "total": 10,
    "by_status": {
      "pending": 5,
      "accepted": 3,
      "completed": 2
    },
    "by_category": {
      "photography": 3,
      "catering": 2,
      "decoration": 5
    },
    "total_estimated_hours": 20,
    "total_actual_hours": 8
  },
  "pagination": {
    "total": 10,
    "limit": 50,
    "offset": 0,
    "has_more": false
  }
}
```

### POST /api/helpers/schedules

Create a new helper assignment.

#### Permission Required
- Wedding Owner only

#### Request Body
```json
{
  "wedding_id": "uuid",
  "helper_id": "uuid",
  "title": "Photography Setup",
  "description": "Set up photography equipment before ceremony",
  "category": "photography",
  "priority": "high",
  "due_date": "2024-06-15T10:00:00Z",
  "estimated_hours": 4,
  "location": "Wedding Venue",
  "requirements": "Professional camera equipment",
  "special_instructions": "Arrive 30 minutes early"
}
```

#### Validation Rules
- `wedding_id`: Must be valid UUID and user must be wedding owner
- `helper_id`: Must be valid UUID and existing user
- `title`: Required, 1-200 characters
- `category`: Required, max 50 characters
- `priority`: One of: low, medium, high, urgent (default: medium)
- `estimated_hours`: 0-24 integer

#### Response
```json
{
  "assignment": {
    // Full assignment object with generated fields
    "id": "uuid",
    "status": "pending",
    "created_at": "2024-01-15T10:00:00Z",
    // ... other fields
  }
}
```

### PUT /api/helpers/schedules

Update an existing helper assignment.

#### Permission Rules
- **Wedding Owners**: Can update all fields
- **Helpers**: Can only update status, notes, and actual_hours

#### Request Body
```json
{
  "id": "uuid",
  "status": "accepted",
  "notes": "Assignment accepted, will arrive on time",
  "actual_hours": 4
}
```

#### Status Transitions
- `pending` → `accepted`, `declined`
- `accepted` → `in_progress`, `cancelled`
- `in_progress` → `completed`, `cancelled`

#### Response
```json
{
  "assignment": {
    // Updated assignment object
  }
}
```

### DELETE /api/helpers/schedules

Delete a helper assignment.

#### Permission Required
- Wedding Owner only

#### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | UUID | Yes | Assignment ID |

#### Response
```json
{
  "message": "Assignment deleted successfully"
}
```

---

## Budget Categories API (WS-163)

Manage wedding budget categories with spending tracking.

### Base URL
```
/api/budget/categories/wedding
```

### GET /api/budget/categories/wedding

Retrieve budget categories for a wedding.

#### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| wedding_id | UUID | Yes | Wedding ID |
| include_inactive | Boolean | No | Include inactive categories (default: false) |
| category_type | String | No | Filter by type (predefined, custom) |

#### Response
```json
{
  "categories": [
    {
      "id": "uuid",
      "wedding_id": "uuid",
      "name": "Photography",
      "description": "Professional wedding photography services",
      "category_type": "predefined",
      "budgeted_amount": 5000,
      "spent_amount": 2500,
      "is_active": true,
      "sort_order": 1,
      "color_code": "#FF5733",
      "icon": "camera",
      "alert_threshold_percent": 80,
      "alert_enabled": true,
      "last_alert_sent_at": null,
      "created_at": "2024-01-15T10:00:00Z",
      "updated_at": "2024-01-15T10:00:00Z",
      // Calculated fields
      "remaining_amount": 2500,
      "percentage_spent": 50,
      "is_overspent": false,
      "overspend_amount": 0,
      "is_near_threshold": false,
      "status": "good",
      "budget_health": "good"
    }
  ],
  "summary": {
    "total_categories": 8,
    "active_categories": 7,
    "total_budgeted": 25000,
    "total_spent": 15000,
    "total_remaining": 10000,
    "categories_overspent": 1,
    "categories_near_threshold": 2,
    "overall_percentage": 60
  }
}
```

#### Budget Health Status
- `good`: < 50% spent
- `moderate`: 50-79% spent
- `warning`: ≥ alert_threshold_percent but not overspent
- `overspent`: spent_amount > budgeted_amount

### POST /api/budget/categories/wedding

Create a new budget category.

#### Permission Required
- Wedding Owner only

#### Request Body
```json
{
  "wedding_id": "uuid",
  "name": "Flowers",
  "description": "Bridal bouquet and ceremony decorations",
  "budgeted_amount": 1500,
  "color_code": "#FF69B4",
  "icon": "flower",
  "alert_threshold_percent": 75,
  "category_type": "custom"
}
```

#### Validation Rules
- `name`: Required, 1-100 characters, unique per wedding
- `budgeted_amount`: Required, minimum 0
- `color_code`: Optional, valid hex color format (#RRGGBB)
- `alert_threshold_percent`: 0-100 integer (default: 80)
- `category_type`: predefined or custom (default: custom)

#### Response
```json
{
  "category": {
    // Full category object with calculated fields
    "id": "uuid",
    "sort_order": 6,
    "spent_amount": 0,
    "is_active": true,
    "alert_enabled": true,
    "percentage_spent": 0,
    "status": "good",
    // ... other fields
  }
}
```

### PUT /api/budget/categories/wedding

Update an existing budget category.

#### Permission Required
- Wedding Owner only

#### Request Body
```json
{
  "id": "uuid",
  "name": "Updated Photography",
  "budgeted_amount": 6000,
  "alert_threshold_percent": 90,
  "is_active": true,
  "sort_order": 1
}
```

#### Response
```json
{
  "category": {
    // Updated category object with recalculated fields
  }
}
```

### DELETE /api/budget/categories/wedding

Delete a budget category.

#### Permission Required
- Wedding Owner only

#### Restrictions
- Cannot delete categories that have associated expenses

#### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | UUID | Yes | Category ID |

#### Response
```json
{
  "message": "Category deleted successfully"
}
```

---

## Expenses API (WS-164)

Manage wedding expenses with receipt tracking.

### Base URL
```
/api/expenses
```

### GET /api/expenses

Retrieve expenses for a wedding with filtering and search.

#### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| wedding_id | UUID | Yes | Wedding ID |
| category_id | UUID | No | Filter by category |
| payment_status | String | No | Filter by status (pending, paid, overdue, cancelled, refunded) |
| vendor_name | String | No | Search vendor names (partial match) |
| start_date | ISO Date | No | Filter by expense date (inclusive) |
| end_date | ISO Date | No | Filter by expense date (inclusive) |
| tags | String | No | Comma-separated list of tags |
| limit | Integer | No | Results limit (default: 50) |
| offset | Integer | No | Results offset (default: 0) |
| sort_by | String | No | Sort field (default: expense_date) |
| sort_order | String | No | asc or desc (default: desc) |

#### Response
```json
{
  "expenses": [
    {
      "id": "uuid",
      "wedding_id": "uuid",
      "category_id": "uuid",
      "created_by_id": "uuid",
      "title": "Wedding Photography",
      "description": "Professional photography services for ceremony and reception",
      "amount": 2500,
      "currency": "USD",
      "vendor_name": "Capture Moments Studio",
      "vendor_contact": "contact@capturemoments.com",
      "payment_method": "credit_card",
      "payment_status": "paid",
      "receipt_urls": [
        "https://storage.example.com/receipts/invoice-001.pdf",
        "https://storage.example.com/receipts/payment-confirmation.jpg"
      ],
      "invoice_number": "CM-2024-001",
      "reference_number": "REF-12345",
      "expense_date": "2024-01-15T10:00:00Z",
      "due_date": "2024-01-30T10:00:00Z",
      "paid_date": "2024-01-20T10:00:00Z",
      "tags": ["photography", "professional", "ceremony"],
      "notes": "Includes engagement photos as bonus",
      "is_recurring": false,
      "recurring_pattern": null,
      "created_at": "2024-01-15T10:00:00Z",
      "updated_at": "2024-01-20T10:00:00Z",
      "budget_categories": {
        "id": "uuid",
        "name": "Photography",
        "color_code": "#FF5733",
        "budgeted_amount": 5000
      },
      "created_by": {
        "id": "uuid",
        "full_name": "Wedding Owner",
        "email": "owner@example.com"
      }
    }
  ],
  "summary": {
    "total_expenses": 25,
    "total_amount": 15000,
    "paid_amount": 12000,
    "pending_amount": 3000,
    "overdue_amount": 0,
    "by_status": {
      "paid": 20,
      "pending": 4,
      "overdue": 1
    },
    "by_category": {
      "Photography": {
        "count": 3,
        "amount": 4500,
        "name": "Photography"
      },
      "Catering": {
        "count": 8,
        "amount": 8000,
        "name": "Catering"
      }
    }
  },
  "pagination": {
    "total": 25,
    "limit": 50,
    "offset": 0,
    "has_more": false
  }
}
```

### POST /api/expenses

Create a new expense.

#### Permission Required
- Wedding Owner only

#### Request Body
```json
{
  "wedding_id": "uuid",
  "category_id": "uuid",
  "title": "Wedding Cake",
  "description": "Three-tier vanilla cake with chocolate filling",
  "amount": 1200,
  "currency": "USD",
  "vendor_name": "Sweet Dreams Bakery",
  "vendor_contact": "orders@sweetdreams.com",
  "payment_method": "credit_card",
  "payment_status": "pending",
  "invoice_number": "SD-2024-789",
  "reference_number": "WED-CAKE-001",
  "expense_date": "2024-03-15T10:00:00Z",
  "due_date": "2024-03-01T10:00:00Z",
  "tags": ["catering", "dessert", "cake"],
  "notes": "Delivery included in price",
  "is_recurring": false
}
```

#### Validation Rules
- `wedding_id`: Required, must be valid UUID and user must be owner
- `category_id`: Required, must belong to the same wedding
- `title`: Required, 1-200 characters
- `amount`: Required, minimum 0
- `currency`: 3-character currency code (default: USD)
- `payment_status`: One of: pending, paid, overdue, cancelled, refunded
- `expense_date`: ISO date string (defaults to current time)

#### Response
```json
{
  "expense": {
    // Full expense object with generated fields
    "id": "uuid",
    "created_by_id": "uuid",
    "created_at": "2024-01-15T10:00:00Z",
    // ... other fields including relations
  }
}
```

### PUT /api/expenses

Update an existing expense.

#### Permission Required
- Wedding Owner only

#### Request Body
```json
{
  "id": "uuid",
  "title": "Updated Wedding Cake",
  "amount": 1500,
  "payment_status": "paid",
  "paid_date": "2024-03-16T10:00:00Z",
  "notes": "Paid in full, upgraded to larger size"
}
```

#### Validation
- Category changes must reference categories belonging to the same wedding
- Cannot change wedding_id

#### Response
```json
{
  "expense": {
    // Updated expense object
  }
}
```

### DELETE /api/expenses

Delete an expense.

#### Permission Required
- Wedding Owner only

#### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | UUID | Yes | Expense ID |

#### Response
```json
{
  "message": "Expense deleted successfully"
}
```

---

## Receipt Upload API

Handle file uploads for expense receipts.

### Base URL
```
/api/receipts/upload
```

### POST /api/receipts/upload

Upload a receipt file.

#### Permission Required
- Wedding Owner only

#### Content Type
```
multipart/form-data
```

#### Form Fields
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| file | File | Yes | Receipt file (JPEG, PNG, WebP, PDF) |
| wedding_id | UUID | Yes | Wedding ID |
| expense_id | UUID | No | Associate with specific expense |

#### File Restrictions
- **Max Size**: 5MB
- **Allowed Types**: image/jpeg, image/png, image/webp, application/pdf
- **Processing**: Images are automatically optimized and converted to WebP when possible

#### Request Example
```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('wedding_id', 'uuid');
formData.append('expense_id', 'uuid'); // optional

const response = await fetch('/api/receipts/upload', {
  method: 'POST',
  body: formData,
  // Don't set Content-Type header - let browser set it with boundary
});
```

#### Response
```json
{
  "success": true,
  "file": {
    "url": "https://storage.supabase.co/receipts/wedding-id/timestamp_filename.webp",
    "storage_path": "wedding-id/timestamp_randomid_filename.webp",
    "file_name": "original-receipt.jpg",
    "file_size": 145678,
    "file_type": "image/webp",
    "uploaded_at": "2024-01-15T10:00:00Z"
  }
}
```

### DELETE /api/receipts/upload

Delete a receipt file.

#### Permission Required
- Wedding Owner only

#### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| storage_path | String | Yes | File storage path |
| expense_id | UUID | No | Remove from expense receipt_urls |
| receipt_url | String | No | Specific URL to remove from expense |

#### Response
```json
{
  "success": true,
  "message": "Receipt deleted successfully"
}
```

### GET /api/receipts/upload

Retrieve receipt information.

#### Permission Required
- Wedding Owner or Helper

#### Query Parameters (One Required)
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| expense_id | UUID | No* | Get receipts for specific expense |
| wedding_id | UUID | No* | Get all receipts for wedding |

*One of expense_id or wedding_id is required

#### Response
```json
{
  "receipts": [
    {
      "expense_id": "uuid",
      "expense_title": "Photography Services",
      "receipt_url": "https://storage.example.com/receipts/receipt1.jpg",
      "storage_path": "wedding-id/receipt1.jpg"
    }
  ]
}
```

---

## Error Handling

### Standard Error Response Format
```json
{
  "error": "Error message description",
  "details": {
    // Additional error details when applicable
  }
}
```

### HTTP Status Codes

#### 400 Bad Request
- Missing required parameters
- Invalid request data
- Validation errors
- File size/type restrictions

#### 401 Unauthorized
- Missing or invalid authentication
- Session expired

#### 403 Forbidden
- Insufficient permissions
- Not wedding owner when required
- Helper accessing restricted operations

#### 404 Not Found
- Wedding not found
- Resource not found
- Invalid IDs

#### 429 Too Many Requests
- Rate limit exceeded
- Includes `Retry-After` header

#### 500 Internal Server Error
- Database errors
- File processing errors
- Unexpected server errors

### Validation Error Details
```json
{
  "error": "Invalid request data",
  "details": [
    {
      "path": "title",
      "message": "String must contain at least 1 character(s)",
      "code": "too_small"
    },
    {
      "path": "amount",
      "message": "Number must be greater than or equal to 0",
      "code": "too_small"
    }
  ]
}
```

---

## Data Models

### Core Types

#### Helper Assignment
```typescript
interface HelperAssignment {
  id: string;
  wedding_id: string;
  helper_id: string;
  assigned_by_id: string;
  title: string;
  description?: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'declined' | 'cancelled';
  due_date?: string;
  estimated_hours?: number;
  actual_hours?: number;
  location?: string;
  requirements?: string;
  special_instructions?: string;
  accepted_at?: string;
  started_at?: string;
  completed_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}
```

#### Budget Category
```typescript
interface BudgetCategory {
  id: string;
  wedding_id: string;
  name: string;
  description?: string;
  category_type: 'predefined' | 'custom';
  budgeted_amount: number;
  spent_amount: number;
  is_active: boolean;
  sort_order: number;
  color_code?: string;
  icon?: string;
  alert_threshold_percent: number;
  alert_enabled: boolean;
  last_alert_sent_at?: string;
  created_at: string;
  updated_at: string;
  // Calculated fields
  remaining_amount: number;
  percentage_spent: number;
  is_overspent: boolean;
  overspend_amount: number;
  is_near_threshold: boolean;
  status: 'good' | 'moderate' | 'warning' | 'overspent';
}
```

#### Expense
```typescript
interface Expense {
  id: string;
  wedding_id: string;
  category_id: string;
  created_by_id: string;
  title: string;
  description?: string;
  amount: number;
  currency: string;
  vendor_name?: string;
  vendor_contact?: string;
  payment_method?: string;
  payment_status: 'pending' | 'paid' | 'overdue' | 'cancelled' | 'refunded';
  receipt_urls: string[];
  invoice_number?: string;
  reference_number?: string;
  expense_date: string;
  due_date?: string;
  paid_date?: string;
  tags: string[];
  notes?: string;
  is_recurring: boolean;
  recurring_pattern?: 'weekly' | 'monthly' | 'yearly';
  created_at: string;
  updated_at: string;
}
```

---

## Security Considerations

### Authentication
- All endpoints require valid Supabase authentication
- Session tokens are validated on each request
- User permissions are enforced through RLS policies

### Authorization
- **Wedding Owners**: Full access to their wedding data
- **Helpers**: Limited access to their assigned tasks
- No cross-wedding data access

### File Upload Security
- File type validation (whitelist approach)
- File size limits (5MB maximum)
- Virus scanning (handled by Supabase Storage)
- Secure file paths with UUID prefixes
- No executable file uploads

### Data Validation
- All inputs validated using Zod schemas
- SQL injection prevention through parameterized queries
- XSS prevention through proper encoding
- CSRF protection available

### Rate Limiting
- Configurable rate limits per endpoint
- IP-based rate limiting
- Proper HTTP headers for retry guidance

---

## Integration Examples

### React/Next.js Integration

#### Helper Assignment Management
```typescript
import { useUser } from '@/hooks/useUser';

// Create assignment
const createAssignment = async (data: CreateAssignmentData) => {
  const response = await fetch('/api/helpers/schedules', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }
  
  return response.json();
};

// Get assignments with filtering
const getAssignments = async (weddingId: string, filters: AssignmentFilters = {}) => {
  const params = new URLSearchParams({
    wedding_id: weddingId,
    ...filters,
  });
  
  const response = await fetch(`/api/helpers/schedules?${params}`);
  return response.json();
};
```

#### Budget Category with Real-time Updates
```typescript
import { useSupabaseRealtime } from '@/hooks/useSupabaseRealtime';

const BudgetCategoryManager = ({ weddingId }: { weddingId: string }) => {
  const [categories, setCategories] = useState<BudgetCategory[]>([]);
  
  // Listen for real-time updates
  useSupabaseRealtime(
    'budget_categories',
    {
      filter: `wedding_id=eq.${weddingId}`,
      event: '*',
    },
    (payload) => {
      // Handle real-time category updates
      fetchCategories();
    }
  );
  
  const fetchCategories = async () => {
    const response = await fetch(`/api/budget/categories/wedding?wedding_id=${weddingId}`);
    const data = await response.json();
    setCategories(data.categories);
  };
  
  // Component implementation...
};
```

#### File Upload with Progress
```typescript
const uploadReceipt = async (file: File, weddingId: string, expenseId?: string) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('wedding_id', weddingId);
  if (expenseId) {
    formData.append('expense_id', expenseId);
  }
  
  const response = await fetch('/api/receipts/upload', {
    method: 'POST',
    body: formData,
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }
  
  return response.json();
};

// With upload progress
const uploadWithProgress = (file: File, onProgress: (progress: number) => void) => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const progress = (e.loaded / e.total) * 100;
        onProgress(progress);
      }
    });
    
    xhr.addEventListener('load', () => {
      if (xhr.status === 201) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        reject(new Error(JSON.parse(xhr.responseText).error));
      }
    });
    
    xhr.addEventListener('error', () => reject(new Error('Upload failed')));
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('wedding_id', weddingId);
    
    xhr.open('POST', '/api/receipts/upload');
    xhr.send(formData);
  });
};
```

---

## Testing

### Test Coverage
All APIs have comprehensive test coverage including:
- ✅ Authentication and authorization tests
- ✅ Input validation and error handling
- ✅ CRUD operations for all endpoints
- ✅ File upload functionality
- ✅ Edge cases and boundary conditions
- ✅ Database error scenarios

### Running Tests
```bash
# Run all API tests
npm test -- --testMatch="**/__tests__/app/api/**/*.test.ts"

# Run specific API tests
npm test -- helper-schedules.test.ts
npm test -- budget-categories.test.ts
npm test -- expenses.test.ts
npm test -- receipt-upload.test.ts
```

---

## Deployment Notes

### Environment Variables Required
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Database Migrations
Ensure all migrations are applied:
```bash
npx supabase migration up --linked
```

### Storage Setup
- Configure Supabase Storage bucket named 'receipts'
- Set appropriate RLS policies for file access
- Configure file size limits in Supabase dashboard

---

## Support

For technical support or questions about this API:
1. Review the error response format and status codes
2. Check authentication and permissions
3. Validate request data against schemas
4. Consult the test files for usage examples

**Last Updated**: 2025-08-28  
**API Version**: 1.0  
**Team**: Team B Backend Implementation