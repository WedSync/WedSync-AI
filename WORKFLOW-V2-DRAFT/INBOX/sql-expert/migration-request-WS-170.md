# SQL Expert Migration Request - WS-170

**Date:** 2025-01-28  
**Feature ID:** WS-170 (Viral Optimization System - Referral API Backend)  
**Requestor:** Team B  
**Priority:** P1 (High Priority - Growth Feature)

---

## Migration Request Summary

Please apply the comprehensive database migration for the WS-170 Viral Referral System. This migration creates the complete database schema required for the referral API backend.

**Migration File:** `/wedsync/supabase/migrations/20250828170000_viral_referral_system.sql`

---

## Database Tables to be Created

### 1. referral_codes (Main referral storage)
- **Purpose**: Store referral codes with usage tracking and expiration
- **Key Features**: Unique code generation, usage counters, campaign tracking
- **Security**: RLS policies for user-specific access

### 2. referral_conversions (Conversion tracking) 
- **Purpose**: Track successful referral conversions with revenue attribution
- **Key Features**: Revenue tracking, conversion types, metadata storage
- **Security**: RLS policies to protect conversion data

### 3. referral_analytics (Event logging)
- **Purpose**: Detailed event logging for referral system analytics
- **Key Features**: Action tracking, timestamp logging, JSON metadata
- **Security**: Secure audit trail with proper access controls

### 4. viral_metrics (Aggregate metrics)
- **Purpose**: Daily aggregate metrics for viral coefficient tracking
- **Key Features**: Daily rollups, viral coefficient calculation, performance metrics
- **Security**: Admin-level access for aggregate data

---

## Key Security Features

✅ **Row Level Security (RLS)** enabled on all tables  
✅ **User-specific data access** through `auth.uid()` policies  
✅ **Comprehensive foreign key constraints** with CASCADE behavior  
✅ **Check constraints** for data integrity validation  
✅ **Audit logging** with security triggers  
✅ **Performance indexes** for <200ms query response times  

---

## Performance Optimizations

### Critical Indexes Created:
- `referral_codes_user_id` - User-specific queries
- `referral_codes_code_lookup` - Fast code validation
- `referral_codes_active` - Active code filtering
- `referral_conversions_code_id` - Conversion lookups
- `referral_analytics_timestamp` - Time-series queries
- `viral_metrics_date` - Daily metrics access

### Materialized View:
- `referral_performance_summary` - Pre-computed analytics for faster dashboard queries

---

## Required Functions & Triggers

### Automatic Maintenance:
- `update_referral_uses()` - Auto-increment usage counters
- `update_updated_at_column()` - Timestamp maintenance
- `update_daily_viral_metrics()` - Daily metric aggregation

### Performance Functions:
- `get_referral_stats(uuid)` - Optimized user statistics
- `refresh_referral_performance_summary()` - Materialized view refresh

---

## Migration Verification Checklist

After applying the migration, please verify:

- [ ] All 4 tables created successfully
- [ ] RLS policies are active and functional
- [ ] All indexes are created and properly named
- [ ] Triggers are working for automatic updates
- [ ] Functions are callable and return expected results
- [ ] Materialized view is populated correctly
- [ ] Foreign key relationships are enforced
- [ ] Check constraints are preventing invalid data

---

## Post-Migration Testing

Please run these verification queries:

```sql
-- Verify table structure
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name IN ('referral_codes', 'referral_conversions', 'referral_analytics', 'viral_metrics')
ORDER BY table_name, ordinal_position;

-- Verify RLS policies
SELECT schemaname, tablename, policyname, cmd, roles 
FROM pg_policies 
WHERE tablename IN ('referral_codes', 'referral_conversions', 'referral_analytics', 'viral_metrics');

-- Verify indexes
SELECT schemaname, tablename, indexname, indexdef
FROM pg_indexes 
WHERE tablename IN ('referral_codes', 'referral_conversions', 'referral_analytics', 'viral_metrics');

-- Test function execution
SELECT * FROM get_referral_stats('00000000-0000-0000-0000-000000000000');
```

---

## Expected Performance Impact

- **Query Performance**: <200ms for all referral operations
- **Storage Requirements**: ~1MB per 10,000 referral codes
- **Index Maintenance**: Minimal overhead with optimized index strategy
- **Concurrent Users**: Designed to handle 1000+ concurrent referral operations

---

## Integration Requirements

This migration supports the following API endpoints:
- `POST /api/referrals/create` - Referral code generation
- `GET /api/referrals/stats` - User statistics and viral metrics

The schema is designed to integrate with:
- **Team A Frontend**: Referral UI components
- **Team C Analytics**: Viral metrics calculation
- **Team D Rewards**: Reward processing system

---

## Rollback Plan

If rollback is needed:

```sql
-- Drop in reverse dependency order
DROP MATERIALIZED VIEW IF EXISTS public.referral_performance_summary;
DROP FUNCTION IF EXISTS refresh_referral_performance_summary();
DROP FUNCTION IF EXISTS get_referral_stats(uuid);
DROP FUNCTION IF EXISTS update_daily_viral_metrics(date);
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP FUNCTION IF EXISTS update_referral_uses();

DROP TABLE IF EXISTS public.viral_metrics;
DROP TABLE IF EXISTS public.referral_analytics;
DROP TABLE IF EXISTS public.referral_conversions;
DROP TABLE IF EXISTS public.referral_codes;

DROP TYPE IF EXISTS public.referral_action;
DROP TYPE IF EXISTS public.conversion_type;
```

---

## Approval Required

**Status:** ✅ Ready for application  
**Code Review:** ✅ Complete  
**Security Review:** ✅ Complete  
**Performance Review:** ✅ Complete  

Please apply this migration at your earliest convenience. The WS-170 API implementation is complete and waiting for the database schema.

**Contact:** Team B - WS-170 Implementation Team  
**Escalation:** If any issues arise during migration application