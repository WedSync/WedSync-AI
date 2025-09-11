# TEAM B - ROUND 1: WS-206 - AI Email Templates System
## 2025-01-20 - Development Round 1

**YOUR MISSION:** Build the complete backend AI email template generation system with OpenAI integration, database schema, and secure API endpoints
**FEATURE ID:** WS-206 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round  
**THINK ULTRA HARD** about AI content generation security, wedding vendor email personalization, and database performance

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la /Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/lib/ai/email-template-generator.ts
ls -la /Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/app/api/ai/email-templates/generate/route.ts
ls -la /Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/supabase/migrations/
cat /Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/lib/ai/email-template-generator.ts | head -20
```

2. **TYPECHECK RESULTS:**
```bash
cd /Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync && npm run typecheck
# MUST show: "No errors found"
```

3. **DATABASE MIGRATION TEST:**
```bash
cd /Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync && npx supabase migration up
# MUST show: "All migrations applied successfully"
```

**Teams submitting hallucinated implementations will be rejected immediately.**

## 📚 STEP 1: ENHANCED DOCUMENTATION & CODEBASE ANALYSIS (MANDATORY - 10 MINUTES!)

### A. SERENA PROJECT ACTIVATION (MINUTES 1-3)
```typescript
// CRITICAL: Activate Serena for semantic code understanding
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// Query specific areas relevant to AI backend services
await mcp__serena__search_for_pattern("OpenAI");
await mcp__serena__find_symbol("api", "", true);
await mcp__serena__get_symbols_overview("src/lib/");
await mcp__serena__get_symbols_overview("supabase/migrations/");
```

### B. BACKEND ARCHITECTURE PATTERNS (MANDATORY)
```typescript
// Load existing API patterns and database schemas
await mcp__serena__read_file("src/lib/supabase.ts");
await mcp__serena__read_file("src/lib/validations");
await mcp__serena__search_for_pattern("withSecureValidation");
```

### C. REF MCP CURRENT DOCS (MINUTES 3-5)
```typescript
// Load documentation SPECIFIC to this feature
await mcp__Ref__ref_search_documentation("OpenAI API chat completions streaming");
await mcp__Ref__ref_search_documentation("Supabase database schema migrations");
await mcp__Ref__ref_search_documentation("Next.js API routes security");
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR COMPLEX FEATURE PLANNING

### Use Sequential Thinking MCP for Complex Analysis
```typescript
mcp__sequential-thinking__sequentialthinking({
  thought: "The AI email template system requires: 1) Secure OpenAI API integration with rate limiting, 2) Database schema for storing templates and variants, 3) Template generation engine with vendor-specific logic, 4) Personalization engine for merge tags, 5) Performance optimization for multiple variants. I need to ensure security, performance, and wedding industry context.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 6
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

Launch these agents with comprehensive requirements:

1. **database-mcp-specialist** - Design and implement email template schema
2. **security-compliance-officer** - Secure OpenAI integration and API endpoints
3. **code-quality-guardian** - Maintain backend code standards and testing
4. **performance-optimization-expert** - Optimize AI generation and database queries
5. **test-automation-architect** - Create comprehensive backend tests
6. **documentation-chronicler** - Document AI service architecture

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### API ROUTE SECURITY CHECKLIST:
- [ ] **Zod validation on EVERY input** - Use withSecureValidation middleware
- [ ] **Authentication check** - getServerSession() for protected routes
- [ ] **Rate limiting applied** - rateLimitService.checkRateLimit() for AI calls
- [ ] **SQL injection prevention** - secureStringSchema for all strings
- [ ] **XSS prevention** - HTML encode all AI-generated content
- [ ] **CSRF protection** - Automatic with Next.js App Router
- [ ] **Error messages sanitized** - Never leak OpenAI API keys or system errors
- [ ] **Audit logging** - Log AI generation requests with user context
- [ ] **OpenAI API key protection** - Use environment variables, never log keys
- [ ] **Content validation** - Validate AI responses before storing

## 🎯 TEAM B SPECIALIZATION:

**BACKEND/API FOCUS:**
- API endpoints with security validation
- Database operations and migrations
- withSecureValidation middleware required
- Authentication and rate limiting
- Error handling and logging
- Business logic implementation

## 📋 TECHNICAL SPECIFICATION
**Real Wedding Scenario:**
A photographer receives an inquiry at 9pm about a beach wedding. The backend system generates 5 personalized email variants using OpenAI, applies wedding vendor merge tags, stores the templates for reuse, and returns them in under 10 seconds while maintaining security and audit logs.

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1

### PRIMARY BACKEND COMPONENTS (MUST BUILD):

#### 1. Database Migration for Email Templates
**Location:** `supabase/migrations/[timestamp]_email_templates_system.sql`

**Schema Implementation:**
```sql
-- AI-generated email templates storage
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  template_name TEXT NOT NULL,
  vendor_type TEXT CHECK (vendor_type IN ('photographer', 'dj', 'caterer', 'venue', 'florist', 'planner')),
  stage TEXT CHECK (stage IN ('inquiry', 'booking', 'planning', 'final', 'post')),
  tone TEXT CHECK (tone IN ('formal', 'friendly', 'casual')),
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  merge_tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  ai_generated BOOLEAN DEFAULT false,
  ai_model TEXT,
  ai_prompt_used TEXT,
  performance_metrics JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE,
  use_count INTEGER DEFAULT 0
);

-- Template variants for A/B testing
CREATE TABLE IF NOT EXISTS email_template_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_template_id UUID REFERENCES email_templates(id) ON DELETE CASCADE,
  variant_label TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  performance_score DECIMAL(3,2) DEFAULT 0.00,
  open_rate DECIMAL(3,2),
  response_rate DECIMAL(3,2),
  send_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX idx_email_templates_supplier ON email_templates(supplier_id);
CREATE INDEX idx_email_templates_stage ON email_templates(vendor_type, stage);
CREATE INDEX idx_template_variants_parent ON email_template_variants(parent_template_id);
```

#### 2. EmailTemplateGenerator Service
**Location:** `src/lib/ai/email-template-generator.ts`

**Core Features:**
- OpenAI API integration with GPT-4
- Vendor-specific prompt engineering
- Multiple variant generation (5 variants)
- Wedding context integration
- Merge tag extraction and injection
- Error handling and fallbacks
- Performance monitoring and logging

**Implementation Pattern:**
```typescript
export class EmailTemplateGenerator {
  private openai: OpenAI;
  private auditLogger: AuditLogger;
  
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    this.auditLogger = new AuditLogger();
  }
  
  async generateTemplates(request: EmailGeneratorRequest): Promise<EmailTemplate[]> {
    // Validate and sanitize input
    // Build context-aware prompt
    // Generate multiple variants
    // Extract and inject merge tags
    // Store in database
    // Return formatted templates
  }
}
```

#### 3. API Endpoints
**Location:** `src/app/api/ai/email-templates/generate/route.ts`

**Endpoints to Build:**
- `POST /api/ai/email-templates/generate` - Generate new templates
- `POST /api/ai/email-templates/personalize` - Personalize with client data
- `GET /api/ai/email-templates/library` - Get template library
- `POST /api/ai/email-templates/test` - A/B testing endpoints

**Security Implementation:**
```typescript
export async function POST(request: NextRequest) {
  try {
    // 1. Authentication check
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Rate limiting
    await rateLimitService.checkRateLimit(session.user.id, 'ai_generation', 10);

    // 3. Input validation
    const body = await request.json();
    const validatedData = EmailGeneratorRequestSchema.parse(body);

    // 4. Generate templates
    const generator = new EmailTemplateGenerator();
    const templates = await generator.generateTemplates({
      ...validatedData,
      supplierId: session.user.id
    });

    // 5. Audit logging
    await auditLogger.log({
      action: 'AI_TEMPLATE_GENERATION',
      userId: session.user.id,
      metadata: { templateCount: templates.length }
    });

    return NextResponse.json({ templates });
  } catch (error) {
    return handleApiError(error);
  }
}
```

#### 4. Personalization Engine
**Location:** `src/lib/ai/email-personalization-engine.ts`

**Features:**
- Handlebars template processing
- Wedding-specific merge tags
- Client data integration
- Conditional content logic
- Performance optimization

### DATABASE REQUIREMENTS:
- [ ] Complete migration for email templates schema
- [ ] Indexes for performance optimization
- [ ] Foreign key constraints for data integrity
- [ ] JSONB fields for flexible metadata storage
- [ ] Audit trail for AI-generated content

### API SECURITY REQUIREMENTS:
- [ ] All endpoints protected with authentication
- [ ] Input validation with Zod schemas
- [ ] Rate limiting on AI generation endpoints
- [ ] Sanitized error responses
- [ ] Comprehensive audit logging

### INTEGRATION REQUIREMENTS:
- [ ] OpenAI API integration with error handling
- [ ] Supabase database operations
- [ ] Email service integration for testing
- [ ] Webhook support for A/B test results
- [ ] Performance monitoring and alerts

### TESTING REQUIREMENTS:
- [ ] Unit tests for EmailTemplateGenerator (>90% coverage)
- [ ] Integration tests for API endpoints
- [ ] Database migration tests
- [ ] Load testing for AI generation
- [ ] Security penetration testing

## 💾 WHERE TO SAVE YOUR WORK
- Services: `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/lib/ai/`
- API Routes: `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/app/api/ai/email-templates/`
- Migrations: `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/supabase/migrations/`
- Tests: `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/__tests__/lib/ai/`
- Reports: `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/WORKFLOW-V2-DRAFT/INBOX/senior-dev/`

## 🏁 COMPLETION CHECKLIST
- [ ] Database migration created and applied successfully
- [ ] EmailTemplateGenerator service implemented
- [ ] API endpoints created with full security
- [ ] OpenAI integration working with rate limiting
- [ ] TypeScript compilation successful
- [ ] All backend tests passing (>90% coverage)
- [ ] Database performance optimized
- [ ] Security requirements implemented
- [ ] Error handling comprehensive
- [ ] Audit logging functional
- [ ] Evidence package with migration proofs prepared
- [ ] Senior dev review prompt created

## 🔧 IMPLEMENTATION PATTERNS:

### OpenAI Integration:
```typescript
// Use streaming for better UX
const stream = await this.openai.chat.completions.create({
  model: 'gpt-4',
  messages: [{ role: 'system', content: systemPrompt }],
  temperature: 0.7,
  max_tokens: 500,
  stream: true
});
```

### Database Operations:
```typescript
// Use transactions for consistency
const { data, error } = await supabase.rpc('create_template_with_variants', {
  template_data: templateData,
  variants_data: variantsData
});
```

### Error Handling:
```typescript
// Comprehensive error handling
try {
  const result = await openai.chat.completions.create();
} catch (error) {
  if (error.code === 'rate_limit_exceeded') {
    throw new RateLimitError('AI generation rate limit exceeded');
  }
  throw new AIGenerationError('Failed to generate templates');
}
```

---

**EXECUTE IMMEDIATELY - This is a comprehensive prompt with all requirements for building the complete AI email template backend system with OpenAI integration!**