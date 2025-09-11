# TEAM B - ROUND 1: WS-344 - Supplier-to-Supplier Referral & Gamification System
## 2025-01-22 - Backend/API Development Focus

**YOUR MISSION:** Build the complete backend referral tracking system with secure APIs, reward automation, and leaderboard calculations
**FEATURE ID:** WS-344 (Track all work with this ID)  
**TIME LIMIT:** 28 hours for comprehensive referral backend system
**THINK ULTRA HARD** about creating fraud-proof referral tracking that accurately rewards suppliers for legitimate conversions

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la /Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/app/api/referrals/
cat /Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/app/api/referrals/create-link/route.ts | head -20
ls -la /Users/skyphotography/CODE/WedSync-2.0/WedSync2/supabase/migrations/
```

2. **TYPECHECK RESULTS:**
```bash
cd /Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync && npm run typecheck
# MUST show: "No errors found"
```

3. **API TESTS RESULTS:**
```bash
cd /Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync && npm test api/referrals
# MUST show: "All API tests passing"
```

4. **DATABASE MIGRATION PROOF:**
```bash
cd /Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync && npx supabase migration list --linked
# MUST show: 055_supplier_referrals.sql applied successfully
```

**Teams submitting hallucinated implementations will be rejected immediately.**

## 📚 STEP 1: ENHANCED DOCUMENTATION & CODEBASE ANALYSIS (MANDATORY - 10 MINUTES!)

### A. SERENA PROJECT ACTIVATION (MINUTES 1-3)
```typescript
// CRITICAL: Activate Serena for semantic code understanding
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// Query existing API patterns and security middleware
await mcp__serena__search_for_pattern("route\\.ts.*POST|GET.*api");
await mcp__serena__find_symbol("withSecureValidation", "", true);
await mcp__serena__get_symbols_overview("src/middleware/security.ts");
await mcp__serena__get_symbols_overview("src/lib/supabase/database.types.ts");
```

### B. DATABASE SCHEMA ANALYSIS (MINUTES 3-5)
```typescript
// Load existing database schema and migration patterns
await mcp__serena__search_for_pattern("CREATE TABLE.*organizations|users");
await mcp__serena__find_symbol("Database", "", true);
await mcp__serena__get_symbols_overview("supabase/migrations");
```

### C. REF MCP CURRENT DOCS (MINUTES 5-7)
```typescript
// Load documentation SPECIFIC to referral tracking systems
await mcp__Ref__ref_search_documentation("Node.js referral tracking system API fraud prevention best practices");
await mcp__Ref__ref_search_documentation("Supabase PostgreSQL leaderboard calculations performance optimization");
await mcp__Ref__ref_search_documentation("Next.js API routes rate limiting authentication middleware");
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR REFERRAL BACKEND ARCHITECTURE

### Use Sequential Thinking MCP for Complex Backend Planning
```typescript
mcp__sequential-thinking__sequential_thinking({
  thought: "For a robust referral system backend, I need to solve several complex problems: 1) Unique referral code generation that prevents collisions, 2) Multi-stage conversion tracking with precise timestamps, 3) Fraud prevention to ensure only legitimate conversions are rewarded, 4) Real-time leaderboard calculations that scale with thousands of suppliers.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 6
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Database design critical decisions: 1) supplier_referrals table tracks full conversion funnel (link_created → link_clicked → signup_started → trial_active → first_payment → reward_issued), 2) Use UUID primary keys for security, 3) Referral codes are 8-character nanoid for uniqueness, 4) Attribution window is 30 days with primary_referrer boolean for multi-touch scenarios.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 6
});

mcp__sequential-thinking__sequential_thinking({
  thought: "API security architecture: 1) All endpoints require authentication via getServerSession(), 2) Rate limiting at 5 requests/minute for referral creation, 3) Zod validation schemas for all inputs, 4) SQL injection prevention with parameterized queries, 5) XSS protection by sanitizing all string inputs, 6) Audit logging for all referral events.",
  nextThoughtNeeded: true,
  thoughtNumber: 3,
  totalThoughts: 6
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Reward automation challenges: 1) Must validate that referred supplier actually made first payment, 2) Credit 1 month free to referrer's subscription, 3) Handle edge cases like subscription downgrades or cancellations, 4) Prevent double-rewards for same conversion, 5) Integration with Stripe billing system for actual credit application.",
  nextThoughtNeeded: true,
  thoughtNumber: 4,
  totalThoughts: 6
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Leaderboard calculation optimization: 1) Use PostgreSQL materialized views for performance, 2) Only count paid conversions (not just signups), 3) Category rankings by supplier type (photography, dj, venue, etc.), 4) Geographic rankings by supplier location, 5) Time-based rankings (all-time, year, quarter, month), 6) Update rankings every 15 minutes via cron job.",
  nextThoughtNeeded: true,
  thoughtNumber: 5,
  totalThoughts: 6
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Critical fraud prevention measures: 1) Validate referral codes against database before tracking, 2) Check IP addresses for suspicious patterns, 3) Verify email domains aren't disposable, 4) Confirm payment webhooks from Stripe before issuing rewards, 5) Attribution window limits prevent gaming, 6) Manual review flags for high-value conversions.",
  nextThoughtNeeded: false,
  thoughtNumber: 6,
  totalThoughts: 6
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

Launch these agents with comprehensive requirements:

1. **task-tracker-coordinator** - Break down API endpoints and database migration tasks
2. **nextjs-fullstack-developer** - Use Serena for consistent API route patterns
3. **supabase-specialist** - Optimize PostgreSQL schema and RLS policies
4. **security-compliance-officer** - Validate all security measures and fraud prevention
5. **test-automation-architect** - Comprehensive API testing with edge cases
6. **documentation-chronicler** - Evidence-based API documentation with examples

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### API ROUTE SECURITY CHECKLIST:
- [ ] **Zod validation on EVERY input** - Use withSecureValidation middleware
- [ ] **Authentication check** - getServerSession() for all protected routes
- [ ] **Rate limiting applied** - rateLimitService.checkRateLimit() on creation endpoints
- [ ] **SQL injection prevention** - secureStringSchema for all string inputs
- [ ] **XSS prevention** - HTML encode all referral codes and custom messages
- [ ] **CSRF protection** - Automatic with Next.js App Router
- [ ] **Error messages sanitized** - Never leak database errors or internal IDs
- [ ] **Audit logging** - Log all referral events with user context and timestamps
- [ ] **Input length limits** - Prevent DoS attacks via oversized inputs
- [ ] **Referral code validation** - Format validation and existence checks

## 🗄️ DATABASE MIGRATION REQUIREMENTS

### STEP 1: Create 055_supplier_referrals.sql Migration
```sql
-- /Users/skyphotography/CODE/WedSync-2.0/WedSync2/supabase/migrations/055_supplier_referrals.sql

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- Supplier Referrals Tracking Table
CREATE TABLE supplier_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  referred_email TEXT NOT NULL,
  referred_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  
  -- Tracking Information
  referral_code TEXT UNIQUE NOT NULL,
  custom_link TEXT NOT NULL,
  qr_code_url TEXT,
  source TEXT CHECK (source IN ('link', 'qr', 'email', 'social', 'direct_entry')) DEFAULT 'link',
  source_details TEXT,
  custom_message TEXT,
  
  -- Status Tracking (Conversion Funnel)
  stage TEXT CHECK (stage IN (
    'link_created', 
    'link_clicked', 
    'signup_started', 
    'trial_active', 
    'first_payment', 
    'reward_issued'
  )) DEFAULT 'link_created',
  
  -- Timestamp Tracking
  clicked_at TIMESTAMPTZ,
  signed_up_at TIMESTAMPTZ,
  trial_started_at TIMESTAMPTZ,
  converted_at TIMESTAMPTZ,
  reward_issued_at TIMESTAMPTZ,
  
  -- Rewards Configuration
  referrer_reward TEXT CHECK (referrer_reward IN ('1_month_free', 'pending', 'not_eligible')) DEFAULT 'pending',
  referee_bonus TEXT DEFAULT '1_month_free_on_subscription',
  reward_value_gbp DECIMAL(10,2) DEFAULT 49.00, -- Track monetary value
  
  -- Attribution & Fraud Prevention
  primary_referrer BOOLEAN DEFAULT true,
  attribution_window INTEGER DEFAULT 30, -- Days
  ip_address INET,
  user_agent TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Leaderboard Rankings (Materialized View for Performance)
CREATE TABLE referral_leaderboard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  
  -- Core Ranking Metrics (Only Paid Conversions Count)
  paid_conversions INTEGER DEFAULT 0,
  total_referrals_sent INTEGER DEFAULT 0,
  conversion_rate DECIMAL(5,2) DEFAULT 0.00,
  months_earned INTEGER DEFAULT 0,
  total_value_earned_gbp DECIMAL(10,2) DEFAULT 0.00,
  
  -- Category Information
  supplier_category TEXT, -- photography, dj, venue, florist, catering, other
  supplier_location TEXT,
  
  -- Multi-Dimensional Rankings
  category_rank INTEGER,
  geographic_rank INTEGER,
  overall_rank INTEGER,
  rank_change INTEGER DEFAULT 0,
  trend TEXT CHECK (trend IN ('rising', 'falling', 'stable')) DEFAULT 'stable',
  
  -- Time Period Tracking
  period_type TEXT CHECK (period_type IN (
    'all_time', 
    'this_year', 
    'this_quarter', 
    'this_month', 
    'this_week'
  )),
  period_start DATE,
  period_end DATE,
  
  -- Performance Metadata
  last_conversion_at TIMESTAMPTZ,
  first_conversion_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Achievement Milestones
CREATE TABLE referral_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  milestone_type TEXT CHECK (milestone_type IN (
    'first_conversion',
    '5_conversions', 
    '10_conversions', 
    '25_conversions', 
    '50_conversions', 
    '100_conversions',
    'monthly_leader',
    'category_leader'
  )),
  milestone_title TEXT NOT NULL,
  milestone_description TEXT NOT NULL,
  reward_description TEXT NOT NULL,
  achieved_at TIMESTAMPTZ DEFAULT NOW(),
  reward_claimed BOOLEAN DEFAULT false,
  claimed_at TIMESTAMPTZ
);

-- Achievement Badges
CREATE TABLE referral_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  badge_id TEXT NOT NULL, -- Unique identifier for badge type
  badge_name TEXT NOT NULL,
  badge_icon TEXT NOT NULL,
  badge_description TEXT NOT NULL,
  badge_color TEXT DEFAULT '#3B82F6', -- Hex color
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate badges
  UNIQUE(supplier_id, badge_id)
);

-- Performance Indexes
CREATE INDEX CONCURRENTLY idx_supplier_referrals_referrer ON supplier_referrals(referrer_id);
CREATE INDEX CONCURRENTLY idx_supplier_referrals_code ON supplier_referrals(referral_code);
CREATE INDEX CONCURRENTLY idx_supplier_referrals_stage ON supplier_referrals(stage);
CREATE INDEX CONCURRENTLY idx_supplier_referrals_converted ON supplier_referrals(converted_at) WHERE converted_at IS NOT NULL;
CREATE INDEX CONCURRENTLY idx_supplier_referrals_created ON supplier_referrals(created_at);
CREATE INDEX CONCURRENTLY idx_referral_leaderboard_category ON referral_leaderboard(category_rank) WHERE category_rank IS NOT NULL;
CREATE INDEX CONCURRENTLY idx_referral_leaderboard_conversions ON referral_leaderboard(paid_conversions DESC);
CREATE INDEX CONCURRENTLY idx_referral_leaderboard_supplier ON referral_leaderboard(supplier_id);

-- Row Level Security Policies
ALTER TABLE supplier_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_leaderboard ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_badges ENABLE ROW LEVEL SECURITY;

-- Policy: Suppliers can only view their own referrals
CREATE POLICY "Users can view own referrals" ON supplier_referrals
  FOR SELECT USING (referrer_id = auth.uid());

-- Policy: Suppliers can create referrals for themselves
CREATE POLICY "Users can create own referrals" ON supplier_referrals
  FOR INSERT WITH CHECK (referrer_id = auth.uid());

-- Policy: System can update referral stages (via service role)
CREATE POLICY "Service role can update referrals" ON supplier_referrals
  FOR UPDATE USING (true); -- Only accessible via service role key

-- Policy: Leaderboard is publicly readable (but not writable)
CREATE POLICY "Leaderboard is publicly readable" ON referral_leaderboard
  FOR SELECT USING (true);

-- Policy: Users can view their own achievements
CREATE POLICY "Users can view own milestones" ON referral_milestones
  FOR SELECT USING (supplier_id = auth.uid());

CREATE POLICY "Users can view own badges" ON referral_badges
  FOR SELECT USING (supplier_id = auth.uid());

-- Update trigger for referrals
CREATE OR REPLACE FUNCTION update_supplier_referrals_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_supplier_referrals_updated
  BEFORE UPDATE ON supplier_referrals
  FOR EACH ROW EXECUTE FUNCTION update_supplier_referrals_timestamp();

-- Function to calculate leaderboard rankings (called by cron job)
CREATE OR REPLACE FUNCTION calculate_referral_leaderboards()
RETURNS void AS $$
BEGIN
  -- Clear existing rankings for recalculation
  DELETE FROM referral_leaderboard;
  
  -- Insert all-time rankings
  INSERT INTO referral_leaderboard (
    supplier_id,
    paid_conversions,
    total_referrals_sent,
    conversion_rate,
    months_earned,
    total_value_earned_gbp,
    supplier_category,
    supplier_location,
    period_type,
    first_conversion_at,
    last_conversion_at
  )
  SELECT 
    r.referrer_id,
    COUNT(*) FILTER (WHERE r.stage = 'first_payment') as paid_conversions,
    COUNT(*) as total_referrals_sent,
    ROUND(
      (COUNT(*) FILTER (WHERE r.stage = 'first_payment')::DECIMAL / 
       NULLIF(COUNT(*), 0) * 100), 2
    ) as conversion_rate,
    COUNT(*) FILTER (WHERE r.stage = 'reward_issued') as months_earned,
    COUNT(*) FILTER (WHERE r.stage = 'reward_issued') * 49.00 as total_value_earned_gbp,
    o.category as supplier_category,
    o.location as supplier_location,
    'all_time' as period_type,
    MIN(r.converted_at) FILTER (WHERE r.stage = 'first_payment') as first_conversion_at,
    MAX(r.converted_at) FILTER (WHERE r.stage = 'first_payment') as last_conversion_at
  FROM supplier_referrals r
  JOIN organizations o ON o.id = r.referrer_id
  GROUP BY r.referrer_id, o.category, o.location;
  
  -- Calculate overall rankings
  UPDATE referral_leaderboard 
  SET overall_rank = ranking.rank
  FROM (
    SELECT id, 
           ROW_NUMBER() OVER (ORDER BY paid_conversions DESC, first_conversion_at ASC) as rank
    FROM referral_leaderboard 
    WHERE period_type = 'all_time'
  ) ranking
  WHERE referral_leaderboard.id = ranking.id;
  
  -- Calculate category rankings
  UPDATE referral_leaderboard 
  SET category_rank = ranking.rank
  FROM (
    SELECT id, 
           ROW_NUMBER() OVER (
             PARTITION BY supplier_category 
             ORDER BY paid_conversions DESC, first_conversion_at ASC
           ) as rank
    FROM referral_leaderboard 
    WHERE period_type = 'all_time'
  ) ranking
  WHERE referral_leaderboard.id = ranking.id;
  
  -- Calculate geographic rankings
  UPDATE referral_leaderboard 
  SET geographic_rank = ranking.rank
  FROM (
    SELECT id, 
           ROW_NUMBER() OVER (
             PARTITION BY supplier_location 
             ORDER BY paid_conversions DESC, first_conversion_at ASC
           ) as rank
    FROM referral_leaderboard 
    WHERE period_type = 'all_time'
  ) ranking
  WHERE referral_leaderboard.id = ranking.id;
  
END;
$$ LANGUAGE plpgsql;

-- Schedule leaderboard recalculation every 15 minutes
SELECT cron.schedule('calculate-referral-leaderboards', '*/15 * * * *', 'SELECT calculate_referral_leaderboards();');

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON supplier_referrals TO authenticated;
GRANT SELECT ON referral_leaderboard TO authenticated, anon;
GRANT SELECT ON referral_milestones TO authenticated;
GRANT SELECT ON referral_badges TO authenticated;
```

## 🛠️ API ENDPOINTS IMPLEMENTATION

### ENDPOINT 1: Create Referral Link (POST /api/referrals/create-link)
```typescript
// /Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/app/api/referrals/create-link/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { createClient } from '@supabase/supabase-js';
import { withSecureValidation } from '@/middleware/security';
import { rateLimitService } from '@/services/rate-limit';
import { auditLogger } from '@/services/audit-log';

const createReferralSchema = z.object({
  customMessage: z.string().max(280).optional(),
  source: z.enum(['dashboard', 'mobile_app']).default('dashboard')
});

export async function POST(request: NextRequest) {
  try {
    // Step 1: Authentication Check
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Step 2: Rate Limiting (5 requests per minute)
    const rateLimitResult = await rateLimitService.checkRateLimit(
      `create-referral:${session.user.email}`,
      5, // requests
      60 // seconds
    );
    
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait before creating another referral link.' },
        { status: 429 }
      );
    }

    // Step 3: Input Validation
    const body = await request.json();
    const validatedInput = createReferralSchema.parse(body);

    // Step 4: Get Supplier Organization
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: supplier, error: supplierError } = await supabase
      .from('organizations')
      .select('id, name, category, location')
      .eq('owner_email', session.user.email)
      .single();

    if (supplierError || !supplier) {
      return NextResponse.json(
        { error: 'Supplier organization not found' },
        { status: 404 }
      );
    }

    // Step 5: Generate Unique Referral Code
    let referralCode: string;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      referralCode = nanoid(8).toUpperCase();
      const { data: existing } = await supabase
        .from('supplier_referrals')
        .select('id')
        .eq('referral_code', referralCode)
        .single();
      
      isUnique = !existing;
      attempts++;
    } while (!isUnique && attempts < maxAttempts);

    if (!isUnique) {
      return NextResponse.json(
        { error: 'Unable to generate unique referral code. Please try again.' },
        { status: 500 }
      );
    }

    // Step 6: Create Referral Link
    const customLink = `${process.env.NEXT_PUBLIC_APP_URL}/join/${referralCode}`;

    // Step 7: Store Referral Record
    const { data: referral, error: insertError } = await supabase
      .from('supplier_referrals')
      .insert({
        referrer_id: supplier.id,
        referral_code: referralCode,
        custom_link: customLink,
        custom_message: validatedInput.customMessage,
        source: 'link',
        source_details: validatedInput.source,
        stage: 'link_created',
        ip_address: request.ip || request.headers.get('x-forwarded-for'),
        user_agent: request.headers.get('user-agent')
      })
      .select()
      .single();

    if (insertError) {
      console.error('Referral creation error:', insertError);
      return NextResponse.json(
        { error: 'Failed to create referral link' },
        { status: 500 }
      );
    }

    // Step 8: Generate QR Code URL (will be handled by integration team)
    // For now, return placeholder
    const qrCodeUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/qr/generate?code=${referralCode}`;

    // Step 9: Audit Log
    await auditLogger.log({
      action: 'referral_link_created',
      userId: session.user.email,
      supplierId: supplier.id,
      details: {
        referralCode,
        customLink,
        source: validatedInput.source
      }
    });

    // Step 10: Return Success Response
    return NextResponse.json({
      success: true,
      data: {
        referralCode,
        customLink,
        qrCodeUrl,
        createdAt: referral.created_at
      }
    });

  } catch (error) {
    console.error('Create referral link error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### ENDPOINT 2: Track Conversion (POST /api/referrals/track-conversion)
```typescript
// /Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/app/api/referrals/track-conversion/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { withSecureValidation } from '@/middleware/security';
import { auditLogger } from '@/services/audit-log';
import { rewardService } from '@/services/referral-rewards';

const trackConversionSchema = z.object({
  referralCode: z.string().length(8).regex(/^[A-Z0-9]{8}$/),
  stage: z.enum(['link_clicked', 'signup_started', 'trial_active', 'first_payment']),
  referredId: z.string().uuid().optional(),
  sourceDetails: z.string().max(500).optional()
});

export async function POST(request: NextRequest) {
  try {
    // Step 1: Input Validation
    const body = await request.json();
    const validatedInput = trackConversionSchema.parse(body);

    // Step 2: Database Connection
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Step 3: Find Referral Record
    const { data: referral, error: findError } = await supabase
      .from('supplier_referrals')
      .select(`
        *,
        referrer:organizations!referrer_id (
          id,
          name,
          owner_email,
          subscription_tier
        )
      `)
      .eq('referral_code', validatedInput.referralCode)
      .single();

    if (findError || !referral) {
      return NextResponse.json(
        { error: 'Referral code not found' },
        { status: 404 }
      );
    }

    // Step 4: Validate Stage Progression
    const stageOrder = ['link_created', 'link_clicked', 'signup_started', 'trial_active', 'first_payment', 'reward_issued'];
    const currentStageIndex = stageOrder.indexOf(referral.stage);
    const newStageIndex = stageOrder.indexOf(validatedInput.stage);

    if (newStageIndex <= currentStageIndex) {
      return NextResponse.json(
        { error: 'Invalid stage progression' },
        { status: 400 }
      );
    }

    // Step 5: Check Attribution Window (30 days)
    const createdAt = new Date(referral.created_at);
    const now = new Date();
    const daysDifference = (now.getTime() - createdAt.getTime()) / (1000 * 3600 * 24);

    if (daysDifference > referral.attribution_window) {
      return NextResponse.json(
        { error: 'Attribution window expired' },
        { status: 400 }
      );
    }

    // Step 6: Prepare Update Object
    const updates: any = {
      stage: validatedInput.stage,
      source_details: validatedInput.sourceDetails,
      updated_at: new Date().toISOString()
    };

    // Add stage-specific timestamps
    switch (validatedInput.stage) {
      case 'link_clicked':
        updates.clicked_at = new Date().toISOString();
        break;
      case 'signup_started':
        updates.signed_up_at = new Date().toISOString();
        break;
      case 'trial_active':
        updates.trial_started_at = new Date().toISOString();
        break;
      case 'first_payment':
        updates.converted_at = new Date().toISOString();
        updates.referrer_reward = '1_month_free';
        if (validatedInput.referredId) {
          updates.referred_id = validatedInput.referredId;
        }
        break;
    }

    // Step 7: Update Referral Record
    const { error: updateError } = await supabase
      .from('supplier_referrals')
      .update(updates)
      .eq('id', referral.id);

    if (updateError) {
      console.error('Referral update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update referral' },
        { status: 500 }
      );
    }

    // Step 8: Handle Conversion Rewards
    let rewardEarned = false;
    let milestoneAchieved = null;

    if (validatedInput.stage === 'first_payment') {
      try {
        const rewardResult = await rewardService.processReferralReward(
          referral.referrer_id,
          referral.id,
          referral.referrer
        );
        rewardEarned = rewardResult.success;
        milestoneAchieved = rewardResult.milestoneAchieved;
      } catch (rewardError) {
        console.error('Reward processing error:', rewardError);
        // Don't fail the conversion tracking if reward processing fails
      }
    }

    // Step 9: Update Leaderboards (async)
    if (validatedInput.stage === 'first_payment') {
      // Trigger leaderboard recalculation (non-blocking)
      supabase.rpc('calculate_referral_leaderboards').then().catch(console.error);
    }

    // Step 10: Audit Log
    await auditLogger.log({
      action: 'referral_conversion_tracked',
      referralId: referral.id,
      referrerEmail: referral.referrer.owner_email,
      details: {
        referralCode: validatedInput.referralCode,
        stage: validatedInput.stage,
        rewardEarned,
        milestoneAchieved
      }
    });

    return NextResponse.json({
      success: true,
      rewardEarned,
      milestoneAchieved
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Track conversion error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### ENDPOINT 3: Get Referral Stats (GET /api/referrals/stats)
```typescript
// /Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/app/api/referrals/stats/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    // Step 1: Authentication Check
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Step 2: Get Supplier Organization
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: supplier, error: supplierError } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('owner_email', session.user.email)
      .single();

    if (supplierError || !supplier) {
      return NextResponse.json(
        { error: 'Supplier organization not found' },
        { status: 404 }
      );
    }

    // Step 3: Get Referral Statistics
    const { data: referralStats, error: statsError } = await supabase
      .from('supplier_referrals')
      .select('stage, created_at, converted_at')
      .eq('referrer_id', supplier.id);

    if (statsError) {
      console.error('Stats query error:', statsError);
      return NextResponse.json(
        { error: 'Failed to fetch referral statistics' },
        { status: 500 }
      );
    }

    // Step 4: Calculate Statistics
    const totalReferrals = referralStats.length;
    const activeTrials = referralStats.filter(r => r.stage === 'trial_active').length;
    const paidConversions = referralStats.filter(r => r.stage === 'first_payment' || r.stage === 'reward_issued').length;
    const conversionRate = totalReferrals > 0 ? (paidConversions / totalReferrals * 100) : 0;
    const monthsEarned = referralStats.filter(r => r.stage === 'reward_issued').length;

    // Step 5: Get Current Rankings
    const { data: leaderboardEntry } = await supabase
      .from('referral_leaderboard')
      .select('category_rank, geographic_rank, overall_rank')
      .eq('supplier_id', supplier.id)
      .eq('period_type', 'all_time')
      .single();

    const currentRankings = {
      category: { rank: leaderboardEntry?.category_rank || 0, total: 0 },
      geographic: { rank: leaderboardEntry?.geographic_rank || 0, total: 0 },
      overall: { rank: leaderboardEntry?.overall_rank || 0, total: 0 }
    };

    // Step 6: Get Recent Activity
    const { data: recentActivity } = await supabase
      .from('supplier_referrals')
      .select('stage, updated_at, referred_email')
      .eq('referrer_id', supplier.id)
      .order('updated_at', { ascending: false })
      .limit(5);

    return NextResponse.json({
      success: true,
      data: {
        totalReferrals,
        activeTrials,
        paidConversions,
        conversionRate: Math.round(conversionRate * 100) / 100,
        monthsEarned,
        currentRankings,
        recentActivity: recentActivity || []
      }
    });

  } catch (error) {
    console.error('Get referral stats error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### ENDPOINT 4: Get Leaderboard (GET /api/referrals/leaderboard)
```typescript
// /Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/app/api/referrals/leaderboard/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

const leaderboardQuerySchema = z.object({
  type: z.enum(['industry', 'geographic', 'temporal']).default('industry'),
  category: z.string().optional(),
  location: z.string().optional(),
  period: z.enum(['all_time', 'this_year', 'this_quarter', 'this_month', 'this_week']).default('all_time'),
  limit: z.coerce.number().min(1).max(100).default(50)
});

export async function GET(request: NextRequest) {
  try {
    // Step 1: Parse Query Parameters
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    const validatedQuery = leaderboardQuerySchema.parse(queryParams);

    // Step 2: Database Connection
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Step 3: Build Query Based on Type
    let query = supabase
      .from('referral_leaderboard')
      .select(`
        supplier_id,
        paid_conversions,
        total_referrals_sent,
        conversion_rate,
        months_earned,
        total_value_earned_gbp,
        supplier_category,
        supplier_location,
        overall_rank,
        category_rank,
        geographic_rank,
        trend,
        organizations!supplier_id (
          name,
          logo_url
        )
      `)
      .eq('period_type', validatedQuery.period)
      .limit(validatedQuery.limit);

    // Apply filters based on type
    switch (validatedQuery.type) {
      case 'industry':
        if (validatedQuery.category) {
          query = query.eq('supplier_category', validatedQuery.category);
        }
        query = query.order('category_rank', { ascending: true });
        break;
      case 'geographic':
        if (validatedQuery.location) {
          query = query.eq('supplier_location', validatedQuery.location);
        }
        query = query.order('geographic_rank', { ascending: true });
        break;
      case 'temporal':
        query = query.order('overall_rank', { ascending: true });
        break;
    }

    // Step 4: Execute Query
    const { data: leaderboardEntries, error: queryError } = await query;

    if (queryError) {
      console.error('Leaderboard query error:', queryError);
      return NextResponse.json(
        { error: 'Failed to fetch leaderboard data' },
        { status: 500 }
      );
    }

    // Step 5: Get Total Entries Count
    let countQuery = supabase
      .from('referral_leaderboard')
      .select('id', { count: 'exact', head: true })
      .eq('period_type', validatedQuery.period);

    if (validatedQuery.category) {
      countQuery = countQuery.eq('supplier_category', validatedQuery.category);
    }
    if (validatedQuery.location) {
      countQuery = countQuery.eq('supplier_location', validatedQuery.location);
    }

    const { count: totalEntries } = await countQuery;

    // Step 6: Get User's Rank (if authenticated)
    let userRank = null;
    try {
      const session = await getServerSession();
      if (session?.user?.email) {
        const { data: userSupplier } = await supabase
          .from('organizations')
          .select('id')
          .eq('owner_email', session.user.email)
          .single();

        if (userSupplier) {
          const { data: userRankData } = await supabase
            .from('referral_leaderboard')
            .select('overall_rank, category_rank, geographic_rank')
            .eq('supplier_id', userSupplier.id)
            .eq('period_type', validatedQuery.period)
            .single();

          if (userRankData) {
            userRank = validatedQuery.type === 'industry' 
              ? userRankData.category_rank
              : validatedQuery.type === 'geographic'
              ? userRankData.geographic_rank
              : userRankData.overall_rank;
          }
        }
      }
    } catch {
      // User rank is optional, don't fail if we can't get it
    }

    return NextResponse.json({
      success: true,
      data: {
        entries: leaderboardEntries || [],
        userRank,
        totalEntries: totalEntries || 0,
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Get leaderboard error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

## 🎯 REAL WEDDING SCENARIO (MANDATORY CONTEXT)

**Wedding Industry Backend Challenge:**
"When DJ Mike clicks Sarah's referral link at a wedding expo, the backend must track this conversion accurately. If Mike signs up immediately but doesn't start his trial until 2 weeks later, then converts to paid after 30 days, the system must correctly attribute the £49 reward to Sarah. However, if another photographer also referred Mike during this period, only the primary referrer (first click) should get the reward. The backend must prevent fraud while handling complex attribution scenarios common in the wedding industry's tight-knit vendor networks."

## 💾 WHERE TO SAVE YOUR WORK

**Database Migration:**
```
/Users/skyphotography/CODE/WedSync-2.0/WedSync2/supabase/migrations/
└── 055_supplier_referrals.sql
```

**API Routes:**
```
/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/app/api/referrals/
├── create-link/route.ts
├── track-conversion/route.ts
├── stats/route.ts
└── leaderboard/route.ts
```

**Service Files:**
```
/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/services/
├── referral-tracking.ts
├── referral-rewards.ts
├── rate-limit.ts
└── audit-log.ts
```

**Type Definitions:**
```
/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/types/
└── referrals.ts
```

**Test Files:**
```
/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/app/api/referrals/__tests__/
├── create-link.test.ts
├── track-conversion.test.ts
├── stats.test.ts
└── leaderboard.test.ts
```

## 🏁 COMPLETION CHECKLIST

**DATABASE IMPLEMENTATION:**
- [ ] **055_supplier_referrals.sql** - Complete migration with all tables and indexes
- [ ] **RLS policies** - Row-level security for data protection
- [ ] **Performance indexes** - Optimized queries for leaderboard calculations
- [ ] **Cron job setup** - Automated leaderboard updates every 15 minutes

**API ENDPOINTS:**
- [ ] **POST /api/referrals/create-link** - Secure referral link generation
- [ ] **POST /api/referrals/track-conversion** - Conversion tracking with fraud prevention
- [ ] **GET /api/referrals/stats** - Personal referral statistics
- [ ] **GET /api/referrals/leaderboard** - Multi-dimensional leaderboard rankings

**SECURITY IMPLEMENTATION:**
- [ ] **Authentication checks** - All protected routes verify user session
- [ ] **Rate limiting** - 5 requests/minute on creation endpoints
- [ ] **Input validation** - Zod schemas for all API inputs
- [ ] **SQL injection prevention** - Parameterized queries throughout
- [ ] **Audit logging** - All referral events logged with context

**TESTING COVERAGE:**
- [ ] **Unit tests** - >90% coverage for all service functions
- [ ] **API tests** - Integration tests for all endpoints
- [ ] **Edge case tests** - Fraud prevention and error handling
- [ ] **Load testing** - Leaderboard performance under concurrent load

**EVIDENCE PACKAGE:**
- [ ] **Migration applied** - Database migration successfully deployed
- [ ] **TypeScript compilation** - No type errors in API routes
- [ ] **API tests passing** - All endpoint tests successful
- [ ] **Performance benchmarks** - API response times <200ms

---

**EXECUTE IMMEDIATELY - Build the backend foundation for WedSync's viral referral system. Focus on creating fraud-proof tracking that accurately rewards suppliers while scaling to handle thousands of wedding vendors sharing referral links across their professional networks.**