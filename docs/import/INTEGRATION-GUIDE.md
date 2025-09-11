# CSV/Excel Import - Integration Guide

**Feature ID**: WS-003  
**Version**: 1.0  
**Status**: Production Ready  
**Last Updated**: 2025-01-21  

## Overview

The CSV/Excel import system provides seamless client data import capabilities with full integration across all WedSync teams. This guide details the integration points, APIs, and implementation details.

## Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   File Upload   │───▶│  Import Wizard  │───▶│   API Routes    │
│                 │    │                 │    │                 │
│ • CSV Support   │    │ • Data Preview  │    │ • Validation    │
│ • Excel Support │    │ • Column Mapping│    │ • Bulk Insert   │
│ • Validation    │    │ • Progress Track│    │ • Error Handle  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                ▲                        │
                                │                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Team A - Lists  │◀───┤  Integration    │───▶│ Team B - Profile│
│                 │    │     Hub         │    │                 │
│ • List Updates  │    │                 │    │ • Profile Create│
│ • Search        │    │ • Team D - DB   │    │ • Data Mapping  │
│ • Bulk Select   │    │ • Team E - Alert│    │ • Navigation    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Team Integration Points

### Team A: Client List Views

#### Integration Components
- **File**: `/src/components/clients/ClientListViews.tsx`
- **Integration Type**: Real-time data display
- **Dependencies**: Client data structure, search functionality

#### Implementation Details

```typescript
// Imported clients automatically appear in all view types
interface ClientData {
  id: string
  first_name: string | null
  last_name: string | null
  partner_first_name: string | null
  partner_last_name: string | null
  email: string | null
  phone: string | null
  wedding_date: string | null
  venue_name: string | null
  status: 'lead' | 'booked' | 'completed' | 'archived'
  package_name: string | null
  package_price: number | null
  is_wedme_connected: boolean
  import_source?: 'csv' | 'excel' | 'manual'
  created_at: string
}
```

#### Integration Points:
1. **List View Updates** - Imported clients appear immediately
2. **Search Integration** - Full-text search includes imported data
3. **Bulk Operations** - Imported clients work with bulk selection
4. **Filtering** - Status, date, and custom filters work seamlessly

#### Testing Integration:
```typescript
// E2E Test Validation
test('Team A Integration', async ({ page }) => {
  // Import clients
  await importClients(['john@example.com', 'jane@example.com'])
  
  // Navigate to client list
  await page.goto('/dashboard/clients')
  
  // Verify clients appear in list
  await expect(page.getByText('john@example.com')).toBeVisible()
  
  // Test search functionality
  await page.fill('[data-testid="client-search"]', 'john')
  await expect(page.getByText('jane@example.com')).not.toBeVisible()
})
```

### Team B: Client Profiles

#### Integration Components
- **File**: `/src/components/clients/profile/ProfileHeader.tsx`
- **Integration Type**: Profile data population
- **Dependencies**: Client profile schema, RBAC system

#### Data Mapping:
```typescript
// Import data maps to profile structure
const profileMapping = {
  // Basic Information
  first_name: 'client.first_name',
  last_name: 'client.last_name', 
  partner_first_name: 'client.partner_first_name',
  partner_last_name: 'client.partner_last_name',
  
  // Contact Information
  email: 'client.email',
  phone: 'client.phone',
  
  // Wedding Details
  wedding_date: 'client.wedding_date',
  venue_name: 'client.venue_name',
  venue_address: 'client.venue_address',
  guest_count: 'client.guest_count',
  
  // Business Information
  status: 'client.status',
  package_name: 'client.package_name',
  package_price: 'client.package_price',
  priority_level: 'client.priority_level',
  
  // Metadata
  import_source: 'csv | excel',
  created_at: 'timestamp'
}
```

#### Profile Creation Process:
1. **Data Validation** - All imported data validated against profile schema
2. **Field Mapping** - CSV/Excel columns mapped to profile fields
3. **Navigation Integration** - Imported clients accessible via profile URLs
4. **Permission Integration** - RBAC permissions applied to imported clients

### Team D: Database Optimizations

#### Integration Components
- **Files**: Database migrations, query optimizations
- **Integration Type**: Performance optimization
- **Dependencies**: Supabase, bulk operations, indexing

#### Optimization Features:
```typescript
// Bulk Insert Optimization
const BATCH_SIZE = 1000 // Optimized batch size for performance

// Uses Team D's optimized bulk insert
async function bulkInsertClients(clients: ClientData[]) {
  const batches = chunk(clients, BATCH_SIZE)
  
  for (const batch of batches) {
    await supabase
      .from('clients')
      .insert(batch)
      // Uses Team D's optimized indexes
      .select('id') 
  }
}
```

#### Performance Optimizations:
1. **Indexed Columns** - All searchable fields properly indexed
2. **Batch Processing** - 1000-record batches for optimal performance
3. **Query Optimization** - Leverages Team D's query patterns
4. **Memory Efficiency** - Streaming inserts prevent memory issues

#### Database Schema Integration:
```sql
-- Uses Team D's optimized client table structure
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  first_name TEXT,
  last_name TEXT,
  partner_first_name TEXT,
  partner_last_name TEXT,
  email TEXT UNIQUE,
  phone TEXT,
  wedding_date DATE,
  venue_name TEXT,
  status client_status DEFAULT 'lead',
  import_source TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Team D's performance indexes
CREATE INDEX CONCURRENTLY idx_clients_organization_status 
ON clients(organization_id, status, created_at DESC);

CREATE INDEX CONCURRENTLY idx_clients_search 
ON clients USING GIN((first_name || ' ' || last_name || ' ' || email) gin_trgm_ops);
```

### Team E: Notification System

#### Integration Components
- **File**: `/src/components/notifications/NotificationDashboard.tsx`
- **Integration Type**: Real-time notifications
- **Dependencies**: Notification service, WebSocket updates

#### Notification Integration:
```typescript
// Import completion notification
interface ImportNotification {
  recipient_id: string
  template_id: 'import_completed'
  channel: 'in_app' | 'email'
  data: {
    success_count: number
    total_count: number
    failed_count: number
    import_id: string
    file_name: string
  }
}

// Progress notifications during import
interface ImportProgressNotification {
  recipient_id: string
  template_id: 'import_progress'
  channel: 'in_app'
  data: {
    progress: number // 0-100
    processed: number
    total: number
    status: 'processing' | 'completed' | 'failed'
  }
}
```

#### Notification Types:
1. **Import Started** - User receives confirmation
2. **Progress Updates** - Real-time progress (every 1 second)
3. **Import Completed** - Success/failure notification with stats
4. **Error Alerts** - Immediate notification of critical errors

## API Integration

### Import API Endpoint

**Endpoint**: `POST /api/clients/import`

#### Request Format:
```typescript
// Form data with file upload
const formData = new FormData()
formData.append('file', file) // CSV or Excel file

// Headers
{
  'Authorization': 'Bearer <token>',
  'Content-Type': 'multipart/form-data'
}
```

#### Response Format:
```typescript
interface ImportResponse {
  success: boolean
  import_id: string
  total_clients: number
  successful_imports: number
  failed_imports: number
  errors: ImportError[]
  performance_metrics: {
    file_size_mb: string
    processing_time_ms: number
    batch_size: number
    batches_processed: number
  }
}

interface ImportError {
  row: number
  field: string
  message: string
  value: string
}
```

#### Error Handling:
```typescript
// Rate limiting
HTTP 429 - Rate limit exceeded
{
  error: 'Rate limit exceeded',
  tier: 'user' | 'ip' | 'organization' | 'global',
  resetTime: timestamp
}

// Validation errors
HTTP 400 - Validation failed
{
  error: 'Validation errors found',
  validation_errors: ImportError[],
  total_clients: number,
  error_count: number
}

// Authentication errors
HTTP 401 - Unauthorized
{
  error: 'Authentication required'
}
```

### Health Check Endpoint

**Endpoint**: `GET /api/clients/import`

```typescript
// Response
{
  status: 'healthy',
  service: 'client-import',
  supported_formats: ['CSV', 'Excel'],
  max_file_size: '50MB',
  max_records: 50000,
  features: [
    'bulk_import',
    'data_validation', 
    'progress_tracking',
    'error_reporting',
    'team_integration'
  ]
}
```

## File Format Specifications

### CSV Format

#### Required Headers (minimum one):
- `first_name` OR `email` (at least one required)

#### Supported Headers:
```csv
first_name,last_name,partner_first_name,partner_last_name,email,phone,wedding_date,venue_name,venue_address,guest_count,budget_range,status,package_name,package_price,priority_level,notes
```

#### Header Variations (auto-detected):
```typescript
const headerMappings = {
  'first_name': ['first_name', 'firstname', 'client_first_name', 'bride_first_name'],
  'last_name': ['last_name', 'lastname', 'client_last_name', 'bride_last_name'],
  'email': ['email', 'email_address', 'contact_email'],
  'phone': ['phone', 'phone_number', 'mobile', 'telephone'],
  'wedding_date': ['wedding_date', 'event_date', 'ceremony_date'],
  'venue_name': ['venue_name', 'venue', 'location']
}
```

#### Example CSV:
```csv
first_name,last_name,partner_first_name,partner_last_name,email,phone,wedding_date,venue_name,status
John,Smith,Jane,Doe,john.smith@example.com,+1234567890,2025-06-15,Grand Hotel,lead
Michael,Johnson,Sarah,Williams,michael.johnson@example.com,+1987654321,2025-07-20,Beach Resort,booked
```

### Excel Format

#### Supported Versions:
- `.xlsx` (Excel 2007+)
- `.xls` (Excel 97-2003)

#### Sheet Selection:
- Uses first sheet in workbook
- Headers must be in first row
- Data starts from row 2

## Error Handling & Validation

### Validation Rules

#### Email Validation:
```typescript
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
if (email && !emailRegex.test(email)) {
  errors.push({
    row: rowNumber,
    field: 'email',
    message: 'Invalid email format',
    value: email
  })
}
```

#### Phone Validation:
```typescript
const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/
const cleanPhone = phone.replace(/[\s\-\(\)]/g, '')
if (phone && !phoneRegex.test(cleanPhone)) {
  errors.push({
    row: rowNumber,
    field: 'phone', 
    message: 'Invalid phone format',
    value: phone
  })
}
```

#### Date Validation:
```typescript
const parsedDate = new Date(dateString)
if (dateString && isNaN(parsedDate.getTime())) {
  errors.push({
    row: rowNumber,
    field: 'wedding_date',
    message: 'Invalid date format',
    value: dateString
  })
}
```

### Security Measures

#### Input Sanitization:
```typescript
function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Basic XSS protection
    .substring(0, 1000) // Length limit
}
```

#### File Security:
- File type validation (MIME type + extension)
- File size limits (50MB maximum)
- Virus scanning hooks available
- Temporary file cleanup

## Performance Specifications

### Performance Requirements (All Validated ✅):

| Operation | Requirement | Actual Performance |
|-----------|-------------|-------------------|
| File Upload (10MB) | ≤30 seconds | ✅ <30 seconds |
| CSV Parsing (10K rows) | ≤5 seconds | ✅ <5 seconds |
| Column Detection | ≤2 seconds | ✅ <2 seconds |
| Data Transform (10K) | ≤10 seconds | ✅ <10 seconds |
| Bulk Insert (10K) | ≤30 seconds | ✅ <30 seconds |
| Memory Usage | ≤500MB | ✅ <500MB |
| Progress Updates | Every 1 second | ✅ 1 second |

### Optimization Features:
- Streaming file processing
- Batch database operations (1000 records/batch)
- Memory-efficient parsing
- Progress tracking with cancellation
- Automatic garbage collection

## Testing Integration

### E2E Test Coverage:
- Complete import workflow
- Team A list view integration  
- Team B profile creation
- Team E notification delivery
- Performance requirements validation
- Security and error handling

### Integration Test Examples:
```typescript
// Full workflow test
test('Complete CSV import integration', async ({ page }) => {
  // Upload file
  await uploadCSVFile(page, 'sample-clients.csv')
  
  // Verify preview
  await expect(page.getByText('50 clients found')).toBeVisible()
  
  // Execute import
  await page.click('[data-testid="start-import"]')
  await expect(page.getByText('Import completed')).toBeVisible()
  
  // Verify Team A integration
  await page.goto('/dashboard/clients')
  await expect(page.getByText('John Smith')).toBeVisible()
  
  // Verify Team B integration  
  await page.click('[data-testid="client-row-1"]')
  await expect(page).toHaveURL(/\/clients\/[^/]+$/)
})
```

## Deployment & Configuration

### Environment Variables:
```env
# Rate limiting
RATE_LIMIT_WHITELIST_IPS=127.0.0.1,192.168.1.0/24

# File upload
MAX_FILE_SIZE_MB=50
MAX_IMPORT_RECORDS=50000

# Notifications
IMPORT_NOTIFICATIONS_ENABLED=true
PROGRESS_UPDATE_INTERVAL_MS=1000
```

### Feature Flags:
```typescript
// Feature flag integration
const importFeatureEnabled = await featureGates.isEnabled(
  'csv_excel_import',
  user.id,
  organization.id
)
```

### Monitoring:
- Import success/failure rates
- Performance metrics tracking
- Error rate monitoring
- Memory usage alerts

## Troubleshooting Guide

### Common Issues:

#### 1. File Upload Fails
**Symptoms**: Upload timeout or failure
**Solutions**:
- Check file size (<50MB)
- Verify file format (CSV/Excel)
- Check network connection
- Verify authentication

#### 2. Parsing Errors
**Symptoms**: "Failed to parse file" error
**Solutions**:
- Check CSV delimiter (comma, semicolon, tab)
- Verify UTF-8 encoding
- Check for malformed headers
- Remove empty rows/columns

#### 3. Validation Errors
**Symptoms**: Data validation failures
**Solutions**:
- Fix email formats (user@domain.com)
- Correct phone numbers (international format)
- Fix date formats (YYYY-MM-DD)
- Add required fields (first_name OR email)

#### 4. Performance Issues
**Symptoms**: Slow import processing
**Solutions**:
- Reduce file size
- Split large imports into batches
- Check server resources
- Optimize data format

## Support & Maintenance

### Contact Information:
- **Team Lead**: CSV/Excel Import Team (Team C)
- **Documentation**: `/docs/import/`
- **Issue Tracking**: GitHub Issues with `WS-003` label
- **Performance Monitoring**: Application monitoring dashboard

### Maintenance Schedule:
- **Performance Reviews**: Monthly
- **Security Updates**: As needed  
- **Integration Testing**: With each major release
- **Documentation Updates**: Quarterly

---

**Last Updated**: 2025-01-21  
**Version**: 1.0  
**Status**: Production Ready ✅