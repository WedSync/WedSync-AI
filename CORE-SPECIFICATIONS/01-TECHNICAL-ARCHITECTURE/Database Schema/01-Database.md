# 01-Database

`# WedSync/WedMe Database Schema Overview

## Purpose
This document provides a complete overview of the PostgreSQL database schema for the WedSync/WedMe platform using Supabase. Every table, relationship, and design decision is documented here for Claude Code to implement the entire database structure.

## Database Design Principles

### 1. Multi-Tenancy Architecture
- ****Supplier-based isolation****: Each supplier's data is isolated using supplier_id foreign keys
- ****Row Level Security (RLS)****: PostgreSQL RLS policies enforce data access at the database level
- ****Couple data sharing****: Couples can selectively share data with connected suppliers

### 2. Core Fields System
- ****Single source of truth****: Wedding details entered once by couples, auto-populated across all supplier forms
- ****Dynamic field states****: Completed ✅, Partial 🟡, Pending ⚪, Not Applicable ❌
- ****Version tracking****: All core field changes are audited for compliance

### 3. Event-Driven Architecture
- ****Activity tracking****: All user actions logged to activity tables
- ****Real-time updates****: Using Supabase Realtime for WebSocket connections
- ****Audit trail****: Complete history of all data modifications

## Database Structure Categories

### 1. User Management Tables
- `suppliers` - Wedding vendor accounts (photographers, venues, caterers, etc.)
- `couples` - Couple accounts planning their wedding
- `team_members` - Additional users under supplier accounts
- `user_profiles` - Extended profile information

### 2. Core Business Tables
- `clients` - Supplier's client records (couples they're working with)
- `forms` - Form templates created by suppliers
- `form_responses` - Submitted form data from couples
- `customer_journeys` - Automated workflow definitions
- `journey_instances` - Active journey executions for specific couples

### 3. Core Fields Tables
- `core_fields` - Master list of standard wedding fields
- `core_field_values` - Couple's entered values for core fields
- `field_mappings` - Maps supplier form fields to core fields
- `field_states` - Tracks completion status of each field

### 4. Communication Tables
- `email_templates` - Reusable email templates
- `sms_templates` - SMS/WhatsApp message templates
- `messages` - Sent message history
- `notifications` - In-app notifications

### 5. Analytics Tables
- `activities` - User action tracking
- `analytics_events` - Custom event tracking
- `performance_metrics` - Aggregated performance data

### 6. Marketplace Tables
- `templates` - Shareable form/journey templates
- `template_purchases` - Marketplace transactions
- `reviews` - Template and service reviews

## Key Design Patterns

### UUID Primary Keys
```sql
-- All tables use UUID v4 for primary keys
id UUID PRIMARY KEY DEFAULT gen_random_uuid()`

**Rationale**: UUIDs prevent enumeration attacks and enable distributed ID generation

### Timestamps Pattern

sql

- `*- Every table includes these timestamp fields*
created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
deleted_at TIMESTAMPTZ *- Soft delete support*`

**Rationale**: Enables audit trails and soft deletion for data recovery

### Multi-Tenancy Pattern

sql

- `*- Supplier-scoped tables include*
supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE NOT NULL,
*- With index for performance*
CREATE INDEX idx_[table]_supplier_id ON [table](supplier_id);`

**Rationale**: Ensures data isolation and enables efficient tenant-based queries

### JSONB for Flexible Data

sql

- `*- Forms, templates, and configurations use JSONB*
form_schema JSONB NOT NULL,
*- With GIN index for JSON queries*
CREATE INDEX idx_[table]_[column]_gin ON [table] USING GIN([column]);`

**Rationale**: Allows flexible schema for user-generated content while maintaining query performance

## Relationships Overview

### Supplier ↔ Client Relationship

- **One-to-Many**: One supplier has many clients
- **Junction Table**: `supplier_client_connections` tracks the relationship
- **Bidirectional Access**: Couples can see connected suppliers, suppliers see their clients

### Form ↔ Response Relationship

- **One-to-Many**: One form template generates many responses
- **Versioning**: Form versions are immutable, responses link to specific versions
- **State Tracking**: Response completion tracked separately from submission

### Journey ↔ Module Relationship

- **Hierarchical**: Journeys contain timeline nodes, nodes contain modules
- **Execution State**: Journey instances track execution state per couple
- **Conditional Logic**: Modules can have conditions based on form responses

### Core Fields Relationships

- **Many-to-Many**: Forms can use multiple core fields, core fields appear in multiple forms
- **Value Inheritance**: Core field values cascade to all mapped form fields
- **Override Capability**: Suppliers can allow couples to override auto-populated values

## Performance Considerations

### Indexing Strategy

1. **Foreign Key Indexes**: All foreign keys have corresponding indexes
2. **Composite Indexes**: Multi-column indexes for common query patterns
3. **Partial Indexes**: Filtered indexes for soft-deleted records
4. **GIN Indexes**: For JSONB and full-text search fields

### Partitioning Strategy

- **Time-based partitioning**: Activity and analytics tables partitioned by month
- **Tenant partitioning**: Large tables partitioned by supplier_id for Scale/Enterprise tiers

### Caching Strategy

- **Materialized Views**: For expensive aggregate queries (analytics dashboards)
- **Redis Integration**: Session data and frequently accessed configurations

## Security Implementation

### Row Level Security (RLS)

Every table has RLS policies defining:

1. **SELECT**: Who can read records
2. **INSERT**: Who can create records
3. **UPDATE**: Who can modify records
4. **DELETE**: Who can remove records

### Data Encryption

- **At-rest**: Supabase encrypts all data at rest
- **In-transit**: TLS 1.3 for all connections
- **Sensitive fields**: Additional application-level encryption for PII

### Audit Requirements

- **Change tracking**: All modifications logged with user, timestamp, and changes
- **Compliance**: GDPR-compliant data handling and deletion
- **Retention**: 7-year audit log retention for financial records

## Migration Strategy

### Initial Setup

1. Create Supabase project
2. Enable required extensions (uuid-ossp, pgcrypto, pg_stat_statements)
3. Run migrations in sequence
4. Apply RLS policies
5. Create initial indexes
6. Set up real-time subscriptions

### Version Control

- All schema changes through numbered migration files
- Rollback scripts for every migration
- Testing migrations on staging before production

## Monitoring Requirements

### Key Metrics

- Query performance (p50, p95, p99 latencies)
- Table sizes and growth rates
- Index usage statistics
- Connection pool utilization
- RLS policy performance impact

### Alerts

- Slow queries > 1 second
- Table size > 1GB
- Failed migrations
- RLS policy violations
- Connection pool exhaustion