# TEAM B - ROUND 1: WS-344 - Supplier-to-Supplier Referral & Gamification System
## 2025-01-22 - Development Round 1

**YOUR MISSION:** Build secure API endpoints and database operations for referral tracking, conversion management, leaderboard calculations, and reward automation
**FEATURE ID:** WS-344 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round  
**THINK ULTRA HARD** about creating bulletproof referral tracking that prevents fraud while scaling to handle viral growth

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/app/api/referrals/
cat $WS_ROOT/wedsync/src/app/api/referrals/create-link/route.ts | head -20
cat $WS_ROOT/wedsync/supabase/migrations/055_supplier_referrals.sql | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test api/referrals
# MUST show: "All tests passing"
```

**Teams submitting hallucinated implementations will be rejected immediately.**

## 📚 STEP 1: ENHANCED DOCUMENTATION & CODEBASE ANALYSIS (MANDATORY - 10 MINUTES!)

### A. SERENA PROJECT ACTIVATION (MINUTES 1-3)
```typescript
// CRITICAL: Activate Serena for semantic code understanding
await mcp__serena__activate_project("$WS_ROOT/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// Query specific areas relevant to API architecture
await mcp__serena__search_for_pattern("api.*route.*security");
await mcp__serena__find_symbol("withSecureValidation", "", true);
await mcp__serena__get_symbols_overview("src/lib/validation");
```

### B. SECURITY ARCHITECTURE REVIEW (MANDATORY)
```typescript
// CRITICAL: Load current security patterns
await mcp__serena__read_file("$WS_ROOT/wedsync/src/lib/validation/middleware.ts");
await mcp__serena__read_file("$WS_ROOT/wedsync/src/lib/validation/schemas.ts");
await mcp__serena__read_file("$WS_ROOT/wedsync/src/lib/auth/options.ts");
```

### C. REF MCP CURRENT DOCS (MINUTES 3-5)
```typescript
// Load documentation SPECIFIC to secure API development
ref_search_documentation("Next.js 15 API route security patterns middleware");
ref_search_documentation("referral system fraud prevention database design");
ref_search_documentation("viral growth tracking architecture");
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR COMPLEX FEATURE PLANNING

### Use Sequential Thinking MCP for Complex Analysis
```typescript
// Use for complex architectural decisions
mcp__sequential-thinking__sequential_thinking({
  thought: "This referral system needs to handle viral growth while preventing fraud. Key challenges: 1) Multi-touch attribution (what if multiple suppliers refer same person?), 2) Gaming prevention (suppliers can't refer themselves), 3) Performance at scale (leaderboards with thousands of suppliers), 4) Real-time updates vs database consistency, 5) Reward validation (only paid conversions count).",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 6
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

Launch these agents with comprehensive requirements:

1. **task-tracker-coordinator** - Break down API endpoints, track security requirements
2. **database-mcp-specialist** - Use PostgreSQL MCP for schema validation  
3. **security-compliance-officer** - Ensure fraud prevention and data protection
4. **code-quality-guardian** - Maintain API standards and patterns
5. **test-automation-architect** - Comprehensive API testing
6. **documentation-chronicler** - Evidence-based API documentation

## 🔒 SECURITY REQUIREMENTS (MANDATORY FOR ALL API ROUTES)

### EVERY API ROUTE MUST HAVE:

1. **INPUT VALIDATION WITH ZOD:**
```typescript
// ❌ NEVER DO THIS:
export async function POST(request: Request) {
  const body = await request.json(); // NO VALIDATION!
  return NextResponse.json(data);
}

// ✅ ALWAYS DO THIS (MANDATORY PATTERN):
import { withSecureValidation } from '$WS_ROOT/wedsync/src/lib/validation/middleware';
import { createReferralLinkSchema } from '$WS_ROOT/wedsync/src/lib/validation/schemas';

export const POST = withSecureValidation(
  createReferralLinkSchema,
  async (request, validatedData) => {
    // validatedData is now type-safe and validated
    const result = await createReferralLink(validatedData);
    return NextResponse.json(result);
  }
);
```

2. **AUTHENTICATION ON PROTECTED ROUTES:**
```typescript
// MANDATORY for all referral routes:
const session = await getServerSession(authOptions);
if (!session) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

// Verify supplier organization access
const supplierId = session.user.organizationId;
if (!supplierId) {
  return NextResponse.json({ error: 'Supplier access required' }, { status: 403 });
}
```

3. **RATE LIMITING (CRITICAL FOR REFERRAL ENDPOINTS):**
```typescript
import { rateLimitService } from '$WS_ROOT/wedsync/src/lib/rate-limiter';

// Referral link creation: 5 per minute per user
const result = await rateLimitService.checkRateLimit(
  request, 
  `referral-create-${supplierId}`, 
  { requests: 5, window: 60 }
);
if (!result.allowed) {
  return NextResponse.json({ 
    error: 'Rate limit exceeded', 
    retryAfter: result.retryAfter 
  }, { status: 429 });
}
```

## 🎯 TEAM B SPECIALIZATION: BACKEND/API FOCUS

**YOUR SPECIFIC DELIVERABLES:**

### 1. Database Migration (Priority 1)
```sql
-- Location: /supabase/migrations/055_supplier_referrals.sql
-- Complete referral tracking schema
CREATE TABLE supplier_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID REFERENCES organizations(id) NOT NULL,
  referred_email TEXT NOT NULL,
  referred_id UUID REFERENCES organizations(id),
  
  -- Tracking Information
  referral_code TEXT UNIQUE NOT NULL,
  custom_link TEXT NOT NULL,
  qr_code_url TEXT,
  source TEXT CHECK (source IN ('link', 'qr', 'email', 'social', 'direct_entry')) DEFAULT 'link',
  source_details TEXT,
  
  -- Status Tracking (5 stages)
  stage TEXT CHECK (stage IN ('link_created', 'link_clicked', 'signup_started', 'trial_active', 'first_payment', 'reward_issued')) DEFAULT 'link_created',
  clicked_at TIMESTAMPTZ,
  signed_up_at TIMESTAMPTZ,
  trial_started_at TIMESTAMPTZ,
  converted_at TIMESTAMPTZ,
  reward_issued_at TIMESTAMPTZ,
  
  -- Rewards
  referrer_reward TEXT CHECK (referrer_reward IN ('1_month_free', 'pending', 'not_eligible')) DEFAULT 'pending',
  referee_bonus TEXT DEFAULT '1_month_free_on_subscription',
  
  -- Attribution & Fraud Prevention
  primary_referrer BOOLEAN DEFAULT true,
  attribution_window INTEGER DEFAULT 30,
  ip_address INET, -- Track for fraud prevention
  user_agent TEXT, -- Track for fraud prevention
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Leaderboard Rankings (Performance Optimized)
CREATE TABLE referral_leaderboard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES organizations(id) NOT NULL,
  
  -- Ranking Metrics (Conversions Only)
  paid_conversions INTEGER DEFAULT 0,
  total_referrals_sent INTEGER DEFAULT 0,
  conversion_rate DECIMAL(5,2) DEFAULT 0.00,
  months_earned INTEGER DEFAULT 0,
  
  -- Category Rankings
  category_rank INTEGER,
  geographic_rank INTEGER, 
  overall_rank INTEGER,
  rank_change INTEGER DEFAULT 0,
  trend TEXT CHECK (trend IN ('rising', 'falling', 'stable')) DEFAULT 'stable',
  
  -- Time Period Tracking
  period_type TEXT CHECK (period_type IN ('all_time', 'this_year', 'this_quarter', 'this_month', 'this_week')),
  
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance Indexes (CRITICAL)
CREATE INDEX idx_supplier_referrals_referrer ON supplier_referrals(referrer_id);
CREATE INDEX idx_supplier_referrals_code ON supplier_referrals(referral_code);
CREATE INDEX idx_supplier_referrals_stage ON supplier_referrals(stage);
CREATE INDEX idx_supplier_referrals_converted ON supplier_referrals(converted_at) WHERE converted_at IS NOT NULL;
CREATE INDEX idx_leaderboard_conversions ON referral_leaderboard(paid_conversions DESC);
```

### 2. Referral Link Creation API
```typescript
// Location: /src/app/api/referrals/create-link/route.ts
export const POST = withSecureValidation(
  createReferralLinkSchema,
  async (request, validatedData) => {
    const session = await getServerSession(authOptions);
    const supplierId = session.user.organizationId;
    
    // Rate limiting
    await rateLimitService.checkRateLimit(request, `referral-create-${supplierId}`, {
      requests: 5, window: 60
    });
    
    // Generate unique referral code
    const referralCode = generateUniqueCode(8);
    const customLink = `${process.env.NEXT_PUBLIC_APP_URL}/join/${referralCode}`;
    
    // Create referral record
    const { data: referral, error } = await supabase
      .from('supplier_referrals')
      .insert({
        referrer_id: supplierId,
        referral_code: referralCode,
        custom_link: customLink,
        stage: 'link_created',
        ip_address: getClientIp(request),
        user_agent: request.headers.get('user-agent')
      })
      .select()
      .single();
      
    if (error) throw new DatabaseError('Failed to create referral link');
    
    // Generate QR code
    const qrCodeUrl = await generateQRCode(customLink, supplierId);
    
    // Update with QR code URL
    await supabase
      .from('supplier_referrals')
      .update({ qr_code_url: qrCodeUrl })
      .eq('id', referral.id);
    
    return NextResponse.json({
      success: true,
      data: {
        referralCode,
        customLink,
        qrCodeUrl
      }
    });
  }
);
```

### 3. Conversion Tracking API
```typescript
// Location: /src/app/api/referrals/track-conversion/route.ts
export const POST = withSecureValidation(
  trackConversionSchema,
  async (request, validatedData) => {
    const { referralCode, stage, referredId, sourceDetails } = validatedData;
    
    // Find referral record with fraud check
    const { data: referral, error: findError } = await supabase
      .from('supplier_referrals')
      .select('*')
      .eq('referral_code', referralCode)
      .single();
      
    if (findError || !referral) {
      return NextResponse.json({ success: false, error: 'Invalid referral code' });
    }
    
    // Prevent self-referral fraud
    if (stage === 'signup_started' && referredId === referral.referrer_id) {
      await auditLog('referral_fraud_attempt', { referralCode, type: 'self_referral' });
      return NextResponse.json({ success: false, error: 'Self-referral not allowed' });
    }
    
    // Update referral stage with timestamp
    const updates: any = { 
      stage,
      updated_at: new Date().toISOString()
    };
    
    if (stage === 'link_clicked') updates.clicked_at = new Date();
    if (stage === 'signup_started') updates.signed_up_at = new Date();
    if (stage === 'trial_active') updates.trial_started_at = new Date();
    if (stage === 'first_payment') {
      updates.converted_at = new Date();
      updates.referrer_reward = '1_month_free';
      if (referredId) updates.referred_id = referredId;
    }
    
    await supabase
      .from('supplier_referrals')
      .update(updates)
      .eq('id', referral.id);
    
    // Process rewards if conversion
    let rewardEarned = false;
    let milestoneAchieved = null;
    
    if (stage === 'first_payment') {
      rewardEarned = await processReferralReward(referral.referrer_id, referral.id);
      milestoneAchieved = await checkMilestones(referral.referrer_id);
      await updateLeaderboards(referral.referrer_id);
    }
    
    return NextResponse.json({
      success: true,
      rewardEarned,
      milestoneAchieved
    });
  }
);
```

### 4. Stats Retrieval API
```typescript
// Location: /src/app/api/referrals/stats/route.ts
export const GET = withAuthentication(async (request, session) => {
  const supplierId = session.user.organizationId;
  
  // Get comprehensive stats
  const [
    referralStats,
    currentRankings,
    recentActivity
  ] = await Promise.all([
    getReferralStats(supplierId),
    getCurrentRankings(supplierId),
    getRecentReferralActivity(supplierId)
  ]);
  
  return NextResponse.json({
    success: true,
    data: {
      totalReferrals: referralStats.total,
      activeTrials: referralStats.trials,
      paidConversions: referralStats.conversions,
      conversionRate: referralStats.rate,
      monthsEarned: referralStats.rewards,
      currentRankings,
      recentActivity
    }
  });
});
```

### 5. Leaderboard API
```typescript
// Location: /src/app/api/referrals/leaderboard/route.ts
export const GET = withValidation(
  leaderboardQuerySchema,
  async (request, validatedQuery) => {
    const { type, category, location, period, limit = 50 } = validatedQuery;
    
    // Build optimized query based on filters
    let query = supabase
      .from('referral_leaderboard')
      .select(`
        *,
        organizations (
          id,
          business_name,
          logo_url,
          business_location,
          business_category
        )
      `)
      .eq('period_type', period || 'all_time')
      .order('paid_conversions', { ascending: false })
      .limit(limit);
    
    // Apply filters
    if (category) {
      query = query.eq('organizations.business_category', category);
    }
    
    if (location) {
      query = query.ilike('organizations.business_location', `%${location}%`);
    }
    
    const { data: entries, error } = await query;
    
    if (error) throw new DatabaseError('Failed to fetch leaderboard');
    
    return NextResponse.json({
      success: true,
      data: {
        entries: entries || [],
        totalEntries: entries?.length || 0,
        lastUpdated: new Date().toISOString()
      }
    });
  }
);
```

### 6. Service Classes
```typescript
// Location: /src/services/referral-tracking.ts
export class ReferralTrackingService {
  async createReferralLink(supplierId: string, customMessage?: string) {
    // Generate unique referral code with collision check
    // Create trackable link with UTM parameters
    // Generate QR code with custom styling
    // Store in database with fraud prevention data
  }
  
  async trackReferralEvent(referralCode: string, stage: string, metadata: any) {
    // Update referral stage with validation
    // Check for milestone achievements
    // Issue rewards if conversion
    // Update leaderboard rankings
    // Audit log for fraud detection
  }
  
  async calculateLeaderboards() {
    // Aggregate conversion data efficiently
    // Rank suppliers by paid conversions only
    // Update all time period tables
    // Cache results for performance
  }
  
  async processReward(referralId: string, rewardType: string) {
    // Credit free months to referrer account
    // Integrate with billing system
    // Send confirmation notifications
    // Record milestone achievements
    // Prevent duplicate rewards
  }
}
```

## 🔐 FRAUD PREVENTION REQUIREMENTS

### Anti-Fraud Measures
```typescript
// 1. Self-referral prevention
if (referredEmail === referrerEmail) {
  throw new FraudError('Self-referral not allowed');
}

// 2. IP address tracking
const clientIp = getClientIp(request);
const recentReferrals = await checkRecentReferralsByIP(clientIp);
if (recentReferrals > 10) {
  throw new RateLimitError('Too many referrals from this IP');
}

// 3. Referral code uniqueness with collision detection
const referralCode = await generateUniqueReferralCode(8, 3); // 3 retry attempts

// 4. Attribution window enforcement
const ATTRIBUTION_WINDOW = 30 * 24 * 60 * 60 * 1000; // 30 days
if (Date.now() - referral.created_at > ATTRIBUTION_WINDOW) {
  return { success: false, error: 'Attribution window expired' };
}
```

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1
- [ ] **Database migration** - Complete referral schema with indexes
- [ ] **Create Link API** - POST /api/referrals/create-link with security
- [ ] **Track Conversion API** - POST /api/referrals/track-conversion
- [ ] **Stats API** - GET /api/referrals/stats with caching
- [ ] **Leaderboard API** - GET /api/referrals/leaderboard with filters
- [ ] **Service classes** - ReferralTrackingService with fraud prevention
- [ ] **Validation schemas** - Zod schemas for all endpoints
- [ ] **Rate limiting** - Implemented on all endpoints
- [ ] **API tests** - Jest tests with >90% coverage

## 💾 WHERE TO SAVE YOUR WORK
- Migration: $WS_ROOT/wedsync/supabase/migrations/055_supplier_referrals.sql
- APIs: $WS_ROOT/wedsync/src/app/api/referrals/[endpoint]/route.ts
- Services: $WS_ROOT/wedsync/src/services/referral-tracking.ts
- Schemas: $WS_ROOT/wedsync/src/lib/validation/referral-schemas.ts
- Tests: $WS_ROOT/wedsync/__tests__/api/referrals/

## 🏁 COMPLETION CHECKLIST
- [ ] **Files created and verified** - All API endpoints exist
- [ ] **TypeScript compilation** - No errors with npm run typecheck
- [ ] **Database migration** - Applied successfully with all indexes
- [ ] **Security validation** - All endpoints use withSecureValidation
- [ ] **Rate limiting** - Implemented on all endpoints
- [ ] **Fraud prevention** - Anti-gaming measures in place
- [ ] **API tests** - All endpoints tested with coverage >90%
- [ ] **Performance optimization** - Leaderboard queries optimized
- [ ] **Evidence package** - Database schema and API test results

---

**EXECUTE IMMEDIATELY - This is a comprehensive prompt with all requirements for Team B Backend work on the WS-344 Supplier Referral & Gamification System!**