# TEAM B - ROUND 1: WS-313 - Growth Features Section Overview
## 2025-01-22 - Development Round 1

**YOUR MISSION:** Build backend API for referral tracking, review automation, and directory integrations with secure data handling
**FEATURE ID:** WS-313 (Track all work with this ID)

## 🚨 EVIDENCE REQUIREMENTS
```bash
ls -la $WS_ROOT/wedsync/src/app/api/growth/
npx supabase migration up --linked  # Migration applied successfully
```

## 🎯 DATABASE SCHEMA
```sql
-- WS-313 Growth Features Schema
CREATE TABLE referral_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES user_profiles(id),
  reward_type VARCHAR(50) NOT NULL,
  reward_amount NUMERIC(10,2),
  tracking_codes JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE review_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES user_profiles(id),
  client_id UUID NOT NULL REFERENCES clients(id),
  status VARCHAR(20) DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ
);
```

## 🎯 API ENDPOINTS
- `GET/POST /api/growth/referrals` - Referral program management
- `GET/POST /api/growth/reviews` - Review campaign automation
- `GET/PUT /api/growth/directories` - Directory listing sync
- `GET /api/growth/metrics` - Growth analytics data

## 🔒 SECURITY REQUIREMENTS
- [ ] withSecureValidation on all endpoints
- [ ] Rate limiting (5 req/min for growth actions)
- [ ] Referral code encryption and validation
- [ ] Review automation respects client preferences

## 💾 FILES TO CREATE
- API: `$WS_ROOT/wedsync/src/app/api/growth/route.ts`
- Migration: `$WS_ROOT/wedsync/supabase/migrations/ws-313_growth_features.sql`
- Validation: `$WS_ROOT/wedsync/src/lib/validations/growth-schema.ts`

**EXECUTE IMMEDIATELY - Build robust growth backend!**