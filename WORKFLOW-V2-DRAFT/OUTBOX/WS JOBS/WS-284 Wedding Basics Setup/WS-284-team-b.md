# TEAM B - ROUND 1: WS-284 - Wedding Basics Setup
## 2025-01-20 - Development Round 1

**YOUR MISSION:** Build secure API endpoints and smart defaults engine for wedding configuration with comprehensive validation
**FEATURE ID:** WS-284 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round
**THINK ULTRA HARD** about wedding data integrity and intelligent recommendation systems

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/app/api/wedding-setup/
cat $WS_ROOT/wedsync/src/app/api/wedding-setup/route.ts | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test wedding-setup
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

// Query wedding data and API patterns
await mcp__serena__search_for_pattern("wedding profile data api endpoint");
await mcp__serena__find_symbol("WeddingProfile ValidationSchema", "", true);
await mcp__serena__get_symbols_overview("src/app/api/");
```

### B. SECURITY AND VALIDATION PATTERNS (MANDATORY)
```typescript
// CRITICAL: Load security validation patterns
await mcp__serena__read_file("$WS_ROOT/wedsync/src/lib/validation/middleware.ts");
await mcp__serena__read_file("$WS_ROOT/wedsync/src/lib/validation/schemas.ts");

// Find existing wedding-related validation patterns
await mcp__serena__search_for_pattern("withSecureValidation secureStringSchema");
await mcp__serena__find_symbol("validateWeddingData weddingSchema", "", true);
```

### C. REF MCP CURRENT DOCS (MINUTES 3-5)
```typescript
// Load documentation SPECIFIC to wedding data APIs
# Use Ref MCP to search for:
# - "Supabase database-schema relationships wedding"
# - "Next.js api-routes validation middleware"
# - "Zod schema-validation complex-objects"
# - "Smart recommendation-algorithms user-data"
```

### D. ANALYZE EXISTING PATTERNS (MINUTES 5-10)
```typescript
// Use Serena to understand existing API and validation patterns
await mcp__serena__find_referencing_symbols("route handler validation");
await mcp__serena__search_for_pattern("database migration wedding");
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR COMPLEX FEATURE PLANNING

### API Security & Wedding Data Strategy
```typescript
mcp__sequential-thinking__sequential_thinking({
  thought: "Wedding setup API requirements: POST /api/wedding-setup/profile (create/update), GET /api/wedding-setup/defaults (smart recommendations), POST /api/wedding-setup/validate (step validation), GET /api/wedding-setup/progress (completion status). Each handles sensitive wedding data requiring strict validation and GDPR compliance.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 5
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Security analysis critical for wedding data: Personal information (names, contacts), financial data (budgets), venue details (addresses), guest information (demographics), vendor preferences. Need input sanitization, SQL injection prevention, data encryption, access control, audit logging for all changes.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 5
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Smart defaults algorithm complexity: Venue type affects weather considerations, catering needs, setup requirements. Wedding date influences vendor availability, pricing tiers, timeline templates. Guest count impacts venue capacity, catering scaling, seating arrangements. Budget range determines vendor tier recommendations.",
  nextThoughtNeeded: true,
  thoughtNumber: 3,
  totalThoughts: 5
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Database schema requirements: wedding_profiles table with normalized structure, venue_types lookup, budget_ranges reference, regional_preferences for location-based defaults, timeline_templates for smart scheduling. Relationships with existing users, clients, and vendor tables.",
  nextThoughtNeeded: true,
  thoughtNumber: 4,
  totalThoughts: 5
});

mcp__sequential-thinking__sequential_thinking({
  thought: "API implementation strategy: Use withSecureValidation for all endpoints, implement comprehensive Zod schemas for wedding data, create smart defaults engine with caching, build step-by-step validation system, add rate limiting for recommendation calls, ensure GDPR compliance with data retention policies.",
  nextThoughtNeeded: false,
  thoughtNumber: 5,
  totalThoughts: 5
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

**Launch these agents with Serena-enhanced capabilities:**

1. **task-tracker-coordinator** --think-hard --use-serena --api-dependencies
   - Mission: Track API endpoint dependencies, validation requirements, database schema needs

2. **database-architect** --think-ultra-hard --wedding-data-expert --schema-optimization
   - Mission: Design normalized wedding profile schema with proper relationships and indexes

3. **security-compliance-officer** --think-ultra-hard --wedding-data-protection --gdpr-expert
   - Mission: Ensure wedding data security, GDPR compliance, audit logging requirements

4. **api-specialist** --continuous --validation-patterns --smart-algorithms
   - Mission: Build secure API endpoints following Serena-discovered patterns

5. **test-automation-architect** --tdd-first --api-testing --security-testing
   - Mission: Create comprehensive API tests including security validation

6. **documentation-chronicler** --detailed-evidence --api-documentation
   - Mission: Document API contracts, validation schemas, and smart defaults algorithms

## 📋 STEP 3: SERENA-ENHANCED DEVELOPMENT WORKFLOW

### **EXPLORE PHASE (MANDATORY - NO CODING YET!)**
```typescript
// Find all related wedding data and API patterns
await mcp__serena__find_symbol("WeddingData ApiRoute Validation", "", true);
await mcp__serena__search_for_pattern("wedding profile database schema");
await mcp__serena__find_referencing_symbols("withSecureValidation middleware");
```
- [ ] Identified existing API patterns and validation middleware
- [ ] Found wedding data structures and relationships
- [ ] Understood security requirements from similar endpoints
- [ ] Located database migration patterns

### **PLAN PHASE (THINK ULTRA HARD!)**
Based on Serena analysis, create detailed API architecture:
- [ ] Database schema design with proper normalization
- [ ] Validation schemas for each wedding setup step
- [ ] Smart defaults algorithm with caching strategy
- [ ] Security measures following discovered patterns

### **CODE PHASE (FOLLOW PATTERNS!)**
- [ ] Use API route patterns discovered by Serena
- [ ] Implement comprehensive validation with Zod
- [ ] Create efficient smart defaults calculation
- [ ] Include security measures and audit logging

## 📋 TECHNICAL SPECIFICATION

### API Endpoints for Wedding Setup:

1. **Wedding Profile Management**
   - `POST /api/wedding-setup/profile` - Create/update wedding profile
   - `GET /api/wedding-setup/profile` - Retrieve current wedding profile
   - `DELETE /api/wedding-setup/profile` - Remove wedding profile (GDPR)

2. **Smart Defaults System**
   - `GET /api/wedding-setup/defaults?venue_type=outdoor&season=summer` - Get smart recommendations
   - `POST /api/wedding-setup/defaults/feedback` - Track defaults usage for improvement

3. **Step-by-Step Validation**
   - `POST /api/wedding-setup/validate/step` - Validate individual wizard step
   - `GET /api/wedding-setup/progress` - Get completion status

4. **Wedding Data Intelligence**
   - `GET /api/wedding-setup/timeline-templates` - Get timeline templates by wedding type
   - `GET /api/wedding-setup/vendor-suggestions` - Get vendor recommendations

### Database Schema Requirements:

```sql
-- Wedding profiles table
CREATE TABLE wedding_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    couple_name_1 VARCHAR(100) NOT NULL,
    couple_name_2 VARCHAR(100) NOT NULL,
    wedding_date DATE NOT NULL,
    venue_type venue_type_enum NOT NULL,
    venue_name VARCHAR(200),
    venue_address TEXT,
    estimated_guest_count INTEGER CHECK (estimated_guest_count > 0),
    budget_range budget_range_enum,
    ceremony_style ceremony_style_enum,
    reception_style reception_style_enum,
    communication_preferences JSONB DEFAULT '{}',
    setup_completed_steps INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Smart defaults cache table
CREATE TABLE wedding_defaults_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_type venue_type_enum NOT NULL,
    season season_enum NOT NULL,
    guest_range guest_range_enum NOT NULL,
    budget_range budget_range_enum NOT NULL,
    defaults_json JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_wedding_profiles_user_id ON wedding_profiles(user_id);
CREATE INDEX idx_wedding_profiles_wedding_date ON wedding_profiles(wedding_date);
CREATE INDEX idx_defaults_cache_lookup ON wedding_defaults_cache(venue_type, season, guest_range, budget_range);
```

## 🎯 SPECIFIC DELIVERABLES

### API Implementation with Evidence:
- [ ] Complete CRUD API for wedding profiles with validation
- [ ] Smart defaults engine with 95% accuracy
- [ ] Step-by-step validation system
- [ ] Progress tracking API
- [ ] Database migration files created
- [ ] Comprehensive error handling and logging

### Security Implementation:
- [ ] Input validation with Zod schemas on ALL endpoints
- [ ] Authentication checks on protected routes
- [ ] Rate limiting on recommendation endpoints
- [ ] SQL injection prevention verified
- [ ] GDPR compliance with data retention policies
- [ ] Audit logging for all wedding data changes

### Performance Requirements:
- [ ] Smart defaults calculation under 200ms
- [ ] Profile CRUD operations under 100ms
- [ ] Database queries optimized with proper indexes
- [ ] Caching strategy for frequently accessed defaults

## 🔗 DEPENDENCIES

**What you need from other teams:**
- Team A: Wedding setup wizard UI component structure and validation requirements
- Team C: Integration requirements with existing user authentication system

**What others need from you:**
- Team A: API contracts and validation schemas for frontend integration
- Team D: Mobile API endpoints optimized for WedMe platform
- Team E: API documentation and test specifications

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### API ROUTE SECURITY CHECKLIST:
- [ ] **Zod validation on EVERY input** - Use withSecureValidation middleware
- [ ] **Authentication check** - getServerSession() for protected routes
- [ ] **Rate limiting applied** - rateLimitService.checkRateLimit() on public endpoints
- [ ] **SQL injection prevention** - secureStringSchema for all strings
- [ ] **XSS prevention** - HTML encode all output
- [ ] **CSRF protection** - Automatic with Next.js App Router
- [ ] **Error messages sanitized** - Never leak database/system errors
- [ ] **Audit logging** - Log all wedding profile changes

### REQUIRED SECURITY IMPORTS:
```typescript
import { withSecureValidation } from '$WS_ROOT/wedsync/src/lib/validation/middleware';
import { secureStringSchema, emailSchema, phoneSchema } from '$WS_ROOT/wedsync/src/lib/validation/schemas';
import { rateLimitService } from '$WS_ROOT/wedsync/src/lib/rate-limiter';
import { getServerSession } from 'next-auth';
import { auditLogger } from '$WS_ROOT/wedsync/src/lib/audit/logger';
```

### WEDDING DATA VALIDATION SCHEMAS:
```typescript
const weddingProfileSchema = z.object({
  couple_name_1: secureStringSchema.min(1).max(100),
  couple_name_2: secureStringSchema.min(1).max(100),
  wedding_date: z.string().pipe(z.coerce.date().min(new Date())),
  venue_type: z.enum(['indoor', 'outdoor', 'destination', 'home', 'religious']),
  venue_name: secureStringSchema.max(200).optional(),
  venue_address: secureStringSchema.max(500).optional(),
  estimated_guest_count: z.number().int().min(1).max(10000),
  budget_range: z.enum(['under_10k', '10k_20k', '20k_50k', '50k_100k', 'over_100k']),
  ceremony_style: z.enum(['traditional', 'modern', 'casual', 'formal', 'themed']),
  reception_style: z.enum(['seated_dinner', 'buffet', 'cocktail', 'brunch', 'none']),
  communication_preferences: z.object({
    email_notifications: z.boolean().default(true),
    sms_notifications: z.boolean().default(false),
    push_notifications: z.boolean().default(true),
    preferred_contact_time: z.enum(['morning', 'afternoon', 'evening', 'anytime']).default('anytime')
  }).default({})
});

const smartDefaultsRequestSchema = z.object({
  venue_type: z.enum(['indoor', 'outdoor', 'destination', 'home', 'religious']),
  wedding_date: z.string().pipe(z.coerce.date()).optional(),
  estimated_guest_count: z.number().int().min(1).max(10000).optional(),
  budget_range: z.enum(['under_10k', '10k_20k', '20k_50k', '50k_100k', 'over_100k']).optional(),
  location: z.object({
    latitude: z.number(),
    longitude: z.number()
  }).optional()
});
```

## 🧪 API TESTING WITH COMPREHENSIVE VALIDATION

```typescript
// 1. WEDDING PROFILE CRUD TESTING
describe('Wedding Profile API', () => {
  test('creates wedding profile with valid data', async () => {
    const validWeddingData = {
      couple_name_1: 'Sarah Johnson',
      couple_name_2: 'Michael Smith',
      wedding_date: '2025-08-15',
      venue_type: 'outdoor',
      venue_name: 'Rosewood Gardens',
      estimated_guest_count: 120,
      budget_range: '20k_50k',
      ceremony_style: 'traditional',
      reception_style: 'seated_dinner'
    };

    const response = await request(app)
      .post('/api/wedding-setup/profile')
      .send(validWeddingData)
      .expect(201);

    expect(response.body).toMatchObject({
      id: expect.any(String),
      ...validWeddingData,
      setup_completed_steps: 6
    });
  });

  test('rejects invalid wedding data', async () => {
    const invalidData = {
      couple_name_1: '', // Empty name
      wedding_date: '2020-01-01', // Past date
      estimated_guest_count: -5 // Negative count
    };

    const response = await request(app)
      .post('/api/wedding-setup/profile')
      .send(invalidData)
      .expect(400);

    expect(response.body.errors).toContain('Names cannot be empty');
    expect(response.body.errors).toContain('Wedding date must be in the future');
    expect(response.body.errors).toContain('Guest count must be positive');
  });
});

// 2. SMART DEFAULTS ENGINE TESTING
describe('Smart Defaults API', () => {
  test('provides accurate outdoor wedding defaults', async () => {
    const response = await request(app)
      .get('/api/wedding-setup/defaults')
      .query({
        venue_type: 'outdoor',
        wedding_date: '2025-06-15',
        estimated_guest_count: 100
      })
      .expect(200);

    expect(response.body.defaults).toMatchObject({
      weather_backup_plan: true,
      recommended_timeline: expect.any(Object),
      suggested_vendors: expect.arrayContaining(['tent_rental', 'weather_insurance']),
      setup_time_hours: expect.any(Number)
    });
  });

  test('caches defaults for performance', async () => {
    const start = Date.now();
    
    // First call
    await request(app)
      .get('/api/wedding-setup/defaults')
      .query({ venue_type: 'indoor', budget_range: '20k_50k' })
      .expect(200);

    const firstCallTime = Date.now() - start;

    // Second identical call (should be faster due to caching)
    const secondStart = Date.now();
    await request(app)
      .get('/api/wedding-setup/defaults')
      .query({ venue_type: 'indoor', budget_range: '20k_50k' })
      .expect(200);

    const secondCallTime = Date.now() - secondStart;
    expect(secondCallTime).toBeLessThan(firstCallTime * 0.5);
  });
});

// 3. SECURITY VALIDATION TESTING
describe('Wedding Setup Security', () => {
  test('prevents SQL injection attacks', async () => {
    const maliciousData = {
      couple_name_1: "'; DROP TABLE wedding_profiles; --",
      couple_name_2: 'Normal Name',
      wedding_date: '2025-08-15'
    };

    await request(app)
      .post('/api/wedding-setup/profile')
      .send(maliciousData)
      .expect(400); // Should be rejected by validation

    // Verify table still exists by making a legitimate request
    await request(app)
      .get('/api/wedding-setup/profile')
      .expect(200);
  });

  test('enforces rate limiting on defaults endpoint', async () => {
    const requests = Array(15).fill().map(() =>
      request(app).get('/api/wedding-setup/defaults?venue_type=indoor')
    );

    const responses = await Promise.all(requests);
    const rateLimitedResponses = responses.filter(r => r.status === 429);
    expect(rateLimitedResponses.length).toBeGreaterThan(0);
  });

  test('requires authentication for profile access', async () => {
    await request(app)
      .get('/api/wedding-setup/profile')
      .expect(401);

    await request(app)
      .post('/api/wedding-setup/profile')
      .send({})
      .expect(401);
  });
});
```

## ✅ ENHANCED SUCCESS CRITERIA (WITH EVIDENCE)

### Technical Implementation:
- [ ] Complete wedding profile CRUD API with 100% validation coverage
- [ ] Smart defaults engine with sub-200ms response time
- [ ] Database schema with proper indexes and relationships
- [ ] Zero TypeScript errors with strict typing
- [ ] Comprehensive error handling with user-friendly messages

### Security Evidence:
```bash
# Verify ALL endpoints have validation
grep -r "withSecureValidation" $WS_ROOT/wedsync/src/app/api/wedding-setup/
# Should show validation on EVERY route.ts file

# Check for authentication on protected routes
grep -r "getServerSession" $WS_ROOT/wedsync/src/app/api/wedding-setup/
# Should be present in profile management routes

# Verify rate limiting
grep -r "rateLimitService" $WS_ROOT/wedsync/src/app/api/wedding-setup/
# Should be applied to defaults and public endpoints
```

### Performance Evidence:
```typescript
// Required API performance metrics
const weddingApiMetrics = {
  profileCreate: "85ms",        // Target: <100ms
  profileRead: "45ms",          // Target: <50ms
  defaultsCalculation: "180ms", // Target: <200ms
  validationTime: "25ms",       // Target: <50ms
  databaseQueryTime: "35ms"     // Target: <50ms
}
```

### Smart Defaults Accuracy:
- [ ] Venue-based recommendations 95% user acceptance
- [ ] Timeline templates match wedding type requirements
- [ ] Vendor suggestions align with budget constraints
- [ ] Regional preferences incorporated correctly

## 💾 WHERE TO SAVE

### API Routes Structure:
```
$WS_ROOT/wedsync/src/app/api/wedding-setup/
├── route.ts                     # Main profile CRUD
├── defaults/
│   ├── route.ts                 # Smart defaults endpoint
│   └── feedback/route.ts        # Defaults usage feedback
├── validate/
│   └── step/route.ts           # Step validation
├── progress/
│   └── route.ts                # Setup completion status
└── timeline-templates/
    └── route.ts                # Timeline recommendations
```

### Database Migrations:
```
$WS_ROOT/wedsync/supabase/migrations/
├── [timestamp]_wedding_profiles_table.sql
├── [timestamp]_wedding_enums.sql
├── [timestamp]_defaults_cache_table.sql
└── [timestamp]_wedding_indexes.sql
```

### Validation Schemas:
```
$WS_ROOT/wedsync/src/lib/validation/wedding-schemas.ts
$WS_ROOT/wedsync/src/lib/wedding/
├── smart-defaults.ts           # Defaults calculation engine
├── validation.ts               # Wedding-specific validation
└── timeline-generator.ts       # Timeline template engine
```

## ⚠️ CRITICAL WARNINGS

### Wedding Data Sensitivity:
- **Personal Information**: Names, contacts, addresses require extra protection
- **Financial Data**: Budget information must be encrypted and access-controlled
- **Timeline Critical**: Wedding dates are immutable once vendors are booked
- **GDPR Compliance**: Right to deletion must preserve vendor contract integrity

### API Performance Considerations:
- **Smart Defaults Caching**: Venue recommendations change seasonally
- **Database Query Optimization**: Guest count affects many calculations
- **Rate Limiting**: Prevent abuse of expensive recommendation algorithms
- **Mobile Optimization**: API responses must be minimal for mobile bandwidth

## 🏁 COMPLETION CHECKLIST (WITH SECURITY VERIFICATION)

### API Security Verification:
```bash
# Verify ALL API routes have validation
grep -r "withSecureValidation\|withValidation" $WS_ROOT/wedsync/src/app/api/wedding-setup/
# Should show validation on EVERY route.ts file

# Check for direct request.json() usage (FORBIDDEN!)
grep -r "request\.json()" $WS_ROOT/wedsync/src/app/api/wedding-setup/ | grep -v "validatedData"
# Should return NOTHING (all should be validated)

# Verify authentication checks
grep -r "getServerSession" $WS_ROOT/wedsync/src/app/api/wedding-setup/
# Should be present in ALL protected routes

# Check rate limiting implementation
grep -r "rateLimitService" $WS_ROOT/wedsync/src/app/api/wedding-setup/
# Should be applied to resource-intensive endpoints
```

### Final Wedding API Checklist:
- [ ] Wedding profile CRUD with comprehensive validation
- [ ] Smart defaults engine with caching and performance optimization
- [ ] Database schema with proper relationships and indexes
- [ ] Step-by-step validation system for wizard integration
- [ ] Security measures implemented: validation, auth, rate limiting
- [ ] GDPR compliance with audit logging and data retention
- [ ] Performance benchmarks met: <200ms for all operations
- [ ] Comprehensive test coverage >95% including security tests
- [ ] Database migrations ready for SQL Expert review

### Wedding Data Protection:
- [ ] Personal wedding information encrypted at rest
- [ ] Budget data access properly controlled
- [ ] Venue information sanitized and validated
- [ ] Guest demographics protected with privacy controls
- [ ] Communication preferences securely stored
- [ ] Audit trail for all wedding data modifications

**✅ Ready for Team A frontend integration and Team E comprehensive API testing**