# TEAM B - ROUND 1: WS-280 - Thank You Management System
## 2025-01-20 - Development Round 1

**YOUR MISSION:** Build secure backend API and database architecture for thank you card management
**FEATURE ID:** WS-280 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round
**THINK ULTRA HARD** about data security, gift privacy, and robust thank you tracking systems

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/app/api/thank-you/
cat $WS_ROOT/wedsync/src/app/api/thank-you/route.ts | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test api/thank-you
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

// Query API patterns and database schemas
await mcp__serena__search_for_pattern("api route database migration gift guest");
await mcp__serena__find_symbol("GuestModel GiftModel ThankYou", "", true);
await mcp__serena__get_symbols_overview("src/app/api/");
```

### B. BACKEND SECURITY PATTERNS (MANDATORY FOR ALL API WORK)
```typescript
// CRITICAL: Load security middleware and validation patterns
await mcp__serena__read_file("$WS_ROOT/wedsync/src/lib/validation/middleware.ts");
await mcp__serena__read_file("$WS_ROOT/wedsync/src/lib/validation/schemas.ts");
await mcp__serena__search_for_pattern("withSecureValidation authentication");
```

### C. REF MCP CURRENT DOCS (MINUTES 3-5)
```typescript
// Load documentation SPECIFIC to backend development
# Use Ref MCP to search for:
# - "Supabase database transactions RLS policies"
# - "Next.js API routes file upload handling"
# - "Zod schema validation refinements"
# - "PostgreSQL indexing strategies"
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR BACKEND ARCHITECTURE

### Use Sequential Thinking MCP for API Design
```typescript
// Use for backend architectural decisions
mcp__sequential-thinking__sequential_thinking({
  thought: "Thank you system backend needs: gift tracking API endpoints, thank you card template storage, photo upload handling, guest-gift association management, progress tracking APIs, reminder scheduling, and integration with existing guest/wedding data.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Database schema analysis: gift_items table (guest_id, description, value, received_date), thank_you_cards table (guest_id, template_id, sent_date, photo_url), thank_you_templates table (template data, customization options), progress tracking in wedding metadata.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Security considerations: Gift values are sensitive financial data, guest addresses are PII requiring encryption, photo uploads need virus scanning and size limits, only wedding owners can access thank you data, audit logging for all modifications.",
  nextThoughtNeeded: true,
  thoughtNumber: 3,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "API design strategy: RESTful endpoints with strict validation, file upload with secure processing, batch operations for efficiency, real-time updates for progress tracking, integration with existing guest list APIs, comprehensive error handling.",
  nextThoughtNeeded: false,
  thoughtNumber: 4,
  totalThoughts: 4
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

Launch these agents with comprehensive requirements:

1. **task-tracker-coordinator** - Track API development and database dependencies
2. **supabase-specialist** - Database schema design with RLS policies  
3. **security-compliance-officer** - Ensure data privacy and file upload security
4. **code-quality-guardian** - API consistency and validation patterns
5. **test-automation-architect** - API testing with security validation
6. **documentation-chronicler** - API documentation with security notes

## 🔒 MANDATORY SECURITY IMPLEMENTATION

```typescript
// EVERY API ROUTE MUST USE THIS PATTERN:
import { withSecureValidation } from '$WS_ROOT/wedsync/src/lib/validation/middleware';
import { z } from 'zod';
import { secureStringSchema } from '$WS_ROOT/wedsync/src/lib/validation/schemas';

const giftTrackingSchema = z.object({
  guest_id: z.string().uuid(),
  gift_description: secureStringSchema.max(200),
  gift_value: z.number().min(0).max(10000).optional(),
  received_date: z.string().datetime(),
  thank_you_sent: z.boolean().default(false),
  notes: secureStringSchema.max(500).optional()
});

export const POST = withSecureValidation(
  giftTrackingSchema,
  async (request, validatedData) => {
    // Check authentication FIRST
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Verify wedding ownership
    const { data: wedding } = await supabase
      .from('weddings')
      .select('couple_id')
      .eq('id', validatedData.wedding_id)
      .single();
    
    if (wedding?.couple_id !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Apply rate limiting for gift updates
    const rateLimitResult = await rateLimitService.checkRateLimit(request, 'gift_tracking', 20);
    if (!rateLimitResult.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }
    
    // Process validated, secure data
    const { data, error } = await supabase
      .from('gift_items')
      .insert(validatedData)
      .select();
      
    if (error) {
      console.error('Gift tracking error:', error);
      return NextResponse.json({ error: 'Failed to track gift' }, { status: 500 });
    }
    
    return NextResponse.json(data);
  }
);
```

### SECURITY CHECKLIST FOR EVERY API ROUTE:
- [ ] **Zod validation on EVERY input** - Use withSecureValidation middleware
- [ ] **Authentication check** - getServerSession() for protected routes
- [ ] **Wedding ownership verification** - Couples can only access their data
- [ ] **Rate limiting applied** - Prevent spam and abuse
- [ ] **SQL injection prevention** - Parameterized queries only
- [ ] **File upload security** - Virus scanning, type validation, size limits
- [ ] **Error messages sanitized** - Never leak sensitive information
- [ ] **Audit logging** - Log all gift tracking and thank you operations

## 🎯 TEAM B SPECIALIZATION: BACKEND/API FOCUS

**BACKEND/API FOCUS:**
- API endpoints with security validation
- Database operations and migrations
- withSecureValidation middleware required
- Authentication and rate limiting
- Error handling and logging
- Business logic implementation

## 📋 DATABASE MIGRATION REQUIREMENTS

### Create migrations for thank you management:

1. **gift_items table**:
```sql
CREATE TABLE gift_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID REFERENCES weddings(id) ON DELETE CASCADE,
  guest_id UUID REFERENCES guests(id) ON DELETE CASCADE,
  gift_description TEXT NOT NULL,
  gift_value DECIMAL(10,2),
  received_date TIMESTAMP WITH TIME ZONE,
  thank_you_sent BOOLEAN DEFAULT FALSE,
  thank_you_sent_date TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS policies
ALTER TABLE gift_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their wedding gifts" ON gift_items
  USING (wedding_id IN (SELECT id FROM weddings WHERE couple_id = auth.uid()));
```

2. **thank_you_cards table**:
```sql
CREATE TABLE thank_you_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID REFERENCES weddings(id) ON DELETE CASCADE,
  guest_id UUID REFERENCES guests(id) ON DELETE CASCADE,
  template_id UUID,
  card_content TEXT,
  photo_url TEXT,
  sent_date TIMESTAMP WITH TIME ZONE,
  mailed_date TIMESTAMP WITH TIME ZONE,
  delivery_confirmed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS policies
ALTER TABLE thank_you_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their wedding thank you cards" ON thank_you_cards
  USING (wedding_id IN (SELECT id FROM weddings WHERE couple_id = auth.uid()));
```

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1
- [ ] Core API endpoints: /api/thank-you/gifts, /api/thank-you/cards, /api/thank-you/progress
- [ ] Secure file upload handling for card photos
- [ ] Database migrations with proper RLS policies
- [ ] Comprehensive input validation with Zod schemas
- [ ] Authentication and authorization checks
- [ ] Rate limiting implementation
- [ ] Error handling and audit logging
- [ ] API tests with security validation

## 💾 WHERE TO SAVE YOUR WORK
- API Routes: $WS_ROOT/wedsync/src/app/api/thank-you/
- Migrations: $WS_ROOT/wedsync/supabase/migrations/
- Types: $WS_ROOT/wedsync/src/types/thank-you.ts
- Tests: $WS_ROOT/wedsync/__tests__/api/thank-you/
- Reports: $WS_ROOT/WORKFLOW-V2-DRAFT/INBOX/senior-dev/

## 🏁 COMPLETION CHECKLIST
- [ ] Files created and verified to exist
- [ ] TypeScript compilation successful
- [ ] All API tests passing
- [ ] Security requirements implemented with withSecureValidation
- [ ] Database migrations created and tested
- [ ] RLS policies implemented and verified
- [ ] Rate limiting configured
- [ ] Evidence package prepared
- [ ] Senior dev review prompt created

---

**EXECUTE IMMEDIATELY - This is a comprehensive prompt with all security requirements!**