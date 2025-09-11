# MIGRATION REQUEST - WS-166 - Budget Reports & Export System

## Team: B - Backend API & Processing
## Round: 1
## Date: 2025-01-20

### Migration Files Created:
- `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/supabase/migrations/20250829092918_ws166_budget_exports_system.sql`

### Purpose:
This migration creates the database schema for the budget export system, enabling couples to generate and download comprehensive budget reports in PDF, CSV, and Excel formats with async processing capabilities.

### Dependencies:
- **Requires tables**: 
  - `couples` (existing) - for foreign key relationship and RLS policies
  - `auth.users` (Supabase auth) - for RLS policy user identification
  
- **Creates tables**: 
  - `budget_exports` - Main export tracking with metadata, status, and file information
  - `export_queue` - Background processing queue with retry logic and priority

- **Modifies tables**: None - only creates new tables

### Key Features:
1. **Export Tracking**: Comprehensive metadata for each export request
2. **Async Processing**: Queue system for background export generation
3. **Security**: Row Level Security policies ensuring data isolation
4. **Performance**: Strategic indexes for common query patterns
5. **Maintenance**: Automated cleanup function for expired exports
6. **File Management**: Support for Supabase Storage integration

### Schema Details:

#### budget_exports table:
- **Primary Purpose**: Track all budget export requests and file metadata
- **Key Fields**: couple_id, export_type, export_filters, file_url, status
- **Status Flow**: generating → completed/failed/expired
- **Security**: RLS policies restrict access to couple's own exports

#### export_queue table:
- **Primary Purpose**: Background processing queue for export generation
- **Key Fields**: export_id, priority, retry_count, error_message
- **Processing Flow**: queued → started → completed/failed
- **Features**: Priority handling, retry logic, error tracking

### RLS Policies Implemented:
1. **Couples can view their own exports** - SELECT policy on budget_exports
2. **Couples can create their own exports** - INSERT policy on budget_exports  
3. **Couples can update their own exports** - UPDATE policy for download tracking
4. **System can manage export queue** - Full access for service role
5. **Couples can view their export queue status** - SELECT policy on export_queue

### Performance Optimizations:
- Indexes on couple_id, status, created_at, expires_at
- Composite index on priority and created_at for queue processing
- Efficient RLS policies using EXISTS subqueries

### Maintenance Functions:
- `cleanup_expired_exports()` - Automated cleanup of old exports
- `update_updated_at_column()` - Timestamp maintenance triggers

### Testing Done:
- [x] SQL syntax validated locally
- [x] RLS policies tested for proper isolation
- [x] Index strategy verified for query patterns
- [x] Foreign key constraints validated

### Special Notes:
- **File Storage**: Designed to work with Supabase Storage for file URLs
- **Queue Processing**: Priority-based queue with retry logic for failed exports
- **Cleanup Strategy**: Automatic expiration and cleanup of old records
- **Security**: All policies ensure complete data isolation between couples
- **Scalability**: Indexed for efficient queries even with large datasets

### Integration Points:
- Will integrate with Supabase Storage for file URLs in `file_url` field
- Queue processing will be handled by background jobs in the API layer
- Export filters stored as JSONB for flexible filtering options

### Risk Assessment: LOW
- Creates only new tables, no modifications to existing schema
- Comprehensive RLS policies prevent data leakage
- No impact on existing functionality
- Well-indexed for performance

**Ready for application to database.**