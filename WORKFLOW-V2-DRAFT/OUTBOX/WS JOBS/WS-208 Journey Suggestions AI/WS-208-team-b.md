# TEAM B - ROUND 1: WS-208 - AI Journey Suggestions System
## 2025-01-20 - Development Round 1

**YOUR MISSION:** Build the complete backend AI journey generation system with OpenAI integration, vendor-specific logic, and performance tracking database
**FEATURE ID:** WS-208 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round  
**THINK ULTRA HARD** about AI journey generation algorithms, wedding vendor workflow patterns, and performance optimization

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la /Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/lib/ai/journey-suggestions-engine.ts
ls -la /Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/app/api/ai/journey/suggest/route.ts
ls -la /Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/supabase/migrations/
cat /Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/lib/ai/journey-suggestions-engine.ts | head -20
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
await mcp__serena__search_for_pattern("AI");
await mcp__serena__find_symbol("journey", "", true);
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
await mcp__Ref__ref_search_documentation("OpenAI API GPT-4 structured outputs");
await mcp__Ref__ref_search_documentation("Supabase JSONB performance optimization");
await mcp__Ref__ref_search_documentation("Next.js API routes validation");
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR COMPLEX FEATURE PLANNING

### Use Sequential Thinking MCP for Complex Analysis
```typescript
mcp__sequential-thinking__sequentialthinking({
  thought: "The AI journey suggestions system requires: 1) Sophisticated OpenAI integration with structured prompts for wedding vendor workflows, 2) Database schema for storing generated journeys and performance metrics, 3) Vendor-specific logic engines for different service types, 4) Performance tracking and machine learning feedback loops, 5) API endpoints with comprehensive validation. I need to ensure accuracy, performance, and wedding industry context.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 6
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

Launch these agents with comprehensive requirements:

1. **database-mcp-specialist** - Design journey AI database schema
2. **security-compliance-officer** - Secure OpenAI integration and API endpoints
3. **code-quality-guardian** - Maintain backend code standards and testing
4. **performance-optimization-expert** - Optimize AI generation and database queries
5. **test-automation-architect** - Create comprehensive backend tests
6. **documentation-chronicler** - Document AI journey architecture

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
- AI integration and processing
- Database operations and migrations
- withSecureValidation middleware required
- Authentication and rate limiting
- Error handling and logging
- Business logic implementation

## 📋 TECHNICAL SPECIFICATION
**Real Wedding Scenario:**
A wedding planner needs different journey templates for full-service planning (24 months), partial planning (12 months), and day-of coordination (3 months). The backend AI system generates optimal touchpoint sequences with vendor-specific timing, validates journey logic, stores performance data for ML improvement, and provides structured journey data for frontend visualization - all within 15 seconds.

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1

### PRIMARY BACKEND COMPONENTS (MUST BUILD):

#### 1. Database Migration for Journey AI System
**Location:** `supabase/migrations/[timestamp]_journey_ai_system.sql`

**Schema Implementation:**
```sql
-- Store generated journeys for learning and reuse
CREATE TABLE IF NOT EXISTS ai_generated_journeys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  vendor_type TEXT NOT NULL CHECK (vendor_type IN ('photographer', 'dj', 'caterer', 'venue', 'planner')),
  service_level TEXT NOT NULL CHECK (service_level IN ('basic', 'premium', 'luxury')),
  wedding_timeline_months INTEGER NOT NULL CHECK (wedding_timeline_months > 0),
  client_preferences JSONB DEFAULT '{}'::jsonb,
  generated_structure JSONB NOT NULL,
  ai_model TEXT DEFAULT 'gpt-4',
  ai_prompt_used TEXT,
  generation_metadata JSONB DEFAULT '{}'::jsonb,
  performance_metrics JSONB DEFAULT '{
    "predicted_completion_rate": 0.0,
    "predicted_engagement_score": 0.0,
    "confidence_score": 0.0,
    "generation_time_ms": 0
  }'::jsonb,
  usage_count INTEGER DEFAULT 0,
  avg_completion_rate DECIMAL(3,2) DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE
);

-- Track journey performance for ML improvement
CREATE TABLE IF NOT EXISTS journey_performance_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id UUID REFERENCES customer_journeys(id) ON DELETE CASCADE,
  ai_suggestion_id UUID REFERENCES ai_generated_journeys(id) ON DELETE SET NULL,
  actual_completion_rate DECIMAL(3,2),
  client_satisfaction_score INTEGER CHECK (client_satisfaction_score BETWEEN 1 AND 5),
  supplier_rating INTEGER CHECK (supplier_rating BETWEEN 1 AND 5),
  modifications_made JSONB DEFAULT '{}'::jsonb,
  performance_notes TEXT,
  feedback_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vendor-specific journey templates and patterns
CREATE TABLE IF NOT EXISTS vendor_journey_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_type TEXT NOT NULL CHECK (vendor_type IN ('photographer', 'dj', 'caterer', 'venue', 'planner')),
  pattern_name TEXT NOT NULL,
  pattern_data JSONB NOT NULL,
  success_rate DECIMAL(3,2) DEFAULT 0.00,
  usage_frequency INTEGER DEFAULT 0,
  industry_standard BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX idx_ai_journeys_vendor_type ON ai_generated_journeys(vendor_type);
CREATE INDEX idx_ai_journeys_service_level ON ai_generated_journeys(service_level);
CREATE INDEX idx_ai_journeys_supplier ON ai_generated_journeys(supplier_id);
CREATE INDEX idx_journey_performance_ai_suggestion ON journey_performance_data(ai_suggestion_id);
CREATE INDEX idx_vendor_patterns_type ON vendor_journey_patterns(vendor_type);
```

#### 2. Journey AI Engine
**Location:** `src/lib/ai/journey-suggestions-engine.ts`

**Core Features:**
- OpenAI GPT-4 integration with structured outputs
- Vendor-specific prompt engineering
- Wedding timeline optimization logic
- Performance prediction algorithms
- Journey validation and enhancement
- Error handling and fallbacks

**Implementation Pattern:**
```typescript
export class JourneySuggestionsEngine {
  private openai: OpenAI;
  private vendorSpecialist: VendorJourneySpecialist;
  private auditLogger: AuditLogger;
  
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    this.vendorSpecialist = new VendorJourneySpecialist();
    this.auditLogger = new AuditLogger();
  }
  
  async generateJourney(request: JourneySuggestionRequest): Promise<GeneratedJourney> {
    // 1. Get vendor-specific context and patterns
    const vendorContext = await this.vendorSpecialist.getVendorContext(request.vendorType);
    const industryPatterns = await this.getIndustryPatterns(request.vendorType, request.serviceLevel);
    
    // 2. Build structured AI prompt
    const systemPrompt = this.buildJourneyGenerationPrompt(request, vendorContext, industryPatterns);
    
    // 3. Generate journey using OpenAI
    const aiResponse = await this.callOpenAI(systemPrompt, request);
    
    // 4. Validate and enhance generated journey
    const validatedJourney = await this.validateAndEnhanceJourney(aiResponse, request);
    
    // 5. Calculate performance predictions
    const performanceMetrics = await this.predictPerformance(validatedJourney, request);
    
    // 6. Store for learning and reuse
    await this.storeGeneratedJourney(validatedJourney, request, performanceMetrics);
    
    return {
      id: validatedJourney.id,
      nodes: validatedJourney.nodes,
      metadata: {
        generatedAt: new Date(),
        basedOn: request,
        confidence: performanceMetrics.confidence_score,
        estimatedPerformance: performanceMetrics
      }
    };
  }
  
  private buildJourneyGenerationPrompt(
    request: JourneySuggestionRequest,
    vendorContext: VendorContext,
    industryPatterns: IndustryPattern[]
  ): string {
    return `You are an expert wedding industry consultant specializing in ${request.vendorType} services.

Create an optimal customer journey for a ${request.vendorType} offering ${request.serviceLevel} service level.

Context:
- Wedding timeline: ${request.weddingTimeline} months
- Communication style: ${request.clientPreferences?.communicationStyle || 'friendly'}
- Contact frequency: ${request.clientPreferences?.frequency || 'regular'}

Industry best practices for ${request.vendorType}:
${vendorContext.bestPractices.map(practice => `- ${practice}`).join('\n')}

Critical touchpoints (required):
${vendorContext.criticalTouchpoints.map(tp => `- ${tp.name}: ${tp.timing} days before wedding`).join('\n')}

Generate a structured customer journey with the following format:
{
  "journey_name": "Descriptive name",
  "total_duration_days": number,
  "nodes": [
    {
      "id": "unique_node_id",
      "type": "email|sms|call|meeting|task",
      "name": "Node display name",
      "timing": {
        "days_from_booking": number,
        "days_before_wedding": number
      },
      "content": {
        "subject": "For emails/sms",
        "template_key": "Template reference",
        "personalization_fields": ["field1", "field2"]
      },
      "triggers": ["condition1", "condition2"],
      "next_nodes": ["node_id1", "node_id2"],
      "vendor_specific_data": {}
    }
  ],
  "conditional_branches": [
    {
      "condition": "client_response_positive",
      "true_path": ["node_id"],
      "false_path": ["alternative_node_id"]
    }
  ]
}

Ensure:
1. Logical timing sequence
2. Vendor-specific touchpoints included
3. Appropriate service level content
4. Conditional logic for different scenarios
5. Personalization opportunities
6. Industry compliance requirements`;
  }
}
```

#### 3. Vendor Journey Specialist
**Location:** `src/lib/services/vendor-journey-specialist.ts`

**Features:**
- Vendor-specific touchpoint logic
- Optimal timing calculations
- Seasonal adjustments
- Service level differentiation
- Industry compliance requirements
- Best practice enforcement

**Wedding Vendor Patterns:**
```typescript
export class VendorJourneySpecialist {
  private vendorPatterns = {
    photographer: {
      criticalTouchpoints: [
        { name: 'contract_signing', timing: 0, required: true },
        { name: 'engagement_session_booking', timing: -90, required: false },
        { name: 'timeline_planning', timing: -30, required: true },
        { name: 'final_details_confirmation', timing: -7, required: true },
        { name: 'day_before_check_in', timing: -1, required: true }
      ],
      serviceSpecific: {
        basic: {
          nodes: ['booking_confirmation', 'timeline_review', 'final_checklist'],
          timeline_buffer: 7
        },
        premium: {
          nodes: ['booking_confirmation', 'engagement_session', 'timeline_review', 'equipment_prep', 'final_checklist'],
          timeline_buffer: 14
        },
        luxury: {
          nodes: ['booking_confirmation', 'consultation_call', 'engagement_session', 'venue_walkthrough', 'timeline_review', 'equipment_prep', 'final_checklist'],
          timeline_buffer: 21
        }
      },
      seasonalAdjustments: {
        peak_season: { buffer_multiplier: 1.5 },
        off_season: { buffer_multiplier: 1.0 }
      }
    },
    caterer: {
      criticalTouchpoints: [
        { name: 'menu_consultation', timing: -120, required: true },
        { name: 'tasting_scheduling', timing: -90, required: true },
        { name: 'final_headcount', timing: -14, required: true },
        { name: 'dietary_restrictions', timing: -7, required: true },
        { name: 'delivery_coordination', timing: -1, required: true }
      ],
      serviceSpecific: {
        basic: {
          nodes: ['menu_selection', 'headcount_confirmation', 'delivery_details'],
          timeline_buffer: 14
        },
        premium: {
          nodes: ['consultation', 'menu_tasting', 'headcount_confirmation', 'special_requirements', 'delivery_coordination'],
          timeline_buffer: 21
        },
        luxury: {
          nodes: ['consultation', 'custom_menu_design', 'multiple_tastings', 'service_planning', 'final_coordination'],
          timeline_buffer: 30
        }
      }
    }
  };

  async buildVendorJourney(
    vendorType: string,
    serviceLevel: string,
    timeline: number
  ): Promise<JourneyNode[]> {
    const pattern = this.vendorPatterns[vendorType];
    const serviceConfig = pattern.serviceSpecific[serviceLevel];
    const nodes: JourneyNode[] = [];
    
    // Add service-specific nodes with optimal timing
    for (const nodeType of serviceConfig.nodes) {
      const touchpoint = pattern.criticalTouchpoints.find(tp => tp.name.includes(nodeType));
      if (touchpoint && Math.abs(touchpoint.timing) < timeline * 30) {
        nodes.push(this.createJourneyNode(nodeType, touchpoint, serviceLevel));
      }
    }
    
    // Apply seasonal adjustments
    const season = this.determineSeason(timeline);
    const adjustedNodes = this.applySeasonalAdjustments(nodes, pattern.seasonalAdjustments[season]);
    
    return this.optimizeNodeSequence(adjustedNodes);
  }
}
```

#### 4. API Endpoints
**Location:** `src/app/api/ai/journey/suggest/route.ts`

**Endpoints to Build:**
- `POST /api/ai/journey/suggest` - Generate new journey suggestion
- `POST /api/ai/journey/optimize` - Optimize existing journey
- `GET /api/ai/journey/patterns` - Get vendor patterns and templates

**Security Implementation:**
```typescript
export async function POST(request: NextRequest) {
  try {
    // 1. Authentication check
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Rate limiting for AI operations
    await rateLimitService.checkRateLimit(session.user.id, 'journey_ai_generation', 10);

    // 3. Input validation
    const body = await request.json();
    const validatedData = JourneySuggestionRequestSchema.parse(body);

    // 4. Generate journey using AI
    const journeyEngine = new JourneySuggestionsEngine();
    const generatedJourney = await journeyEngine.generateJourney({
      ...validatedData,
      supplierId: session.user.id
    });

    // 5. Audit logging
    await auditLogger.log({
      action: 'AI_JOURNEY_GENERATION',
      userId: session.user.id,
      metadata: { 
        vendorType: validatedData.vendorType,
        serviceLevel: validatedData.serviceLevel,
        timeline: validatedData.weddingTimeline
      }
    });

    return NextResponse.json({ journey: generatedJourney });
  } catch (error) {
    return handleApiError(error);
  }
}
```

#### 5. Performance Tracking System
**Location:** `src/lib/services/journey-performance-tracker.ts`

**Features:**
- Real-time performance monitoring
- ML feedback collection
- Journey optimization suggestions
- Industry benchmark comparisons
- Predictive analytics

### DATABASE REQUIREMENTS:
- [ ] Complete migration for AI journey system
- [ ] Indexes for performance optimization
- [ ] Foreign key constraints for data integrity
- [ ] JSONB fields for flexible journey structure storage
- [ ] Performance tracking tables

### API SECURITY REQUIREMENTS:
- [ ] All endpoints protected with authentication
- [ ] Input validation with Zod schemas
- [ ] Rate limiting on AI generation endpoints
- [ ] Sanitized error responses
- [ ] Comprehensive audit logging

### AI INTEGRATION REQUIREMENTS:
- [ ] OpenAI GPT-4 integration with structured outputs
- [ ] Vendor-specific prompt engineering
- [ ] Error handling and fallback strategies
- [ ] Performance monitoring and optimization
- [ ] Content validation and sanitization

### TESTING REQUIREMENTS:
- [ ] Unit tests for JourneySuggestionsEngine (>90% coverage)
- [ ] Integration tests for API endpoints
- [ ] Database migration tests
- [ ] AI response validation tests
- [ ] Performance benchmarking

## 💾 WHERE TO SAVE YOUR WORK
- AI Services: `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/lib/ai/`
- Business Services: `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/lib/services/`
- API Routes: `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/app/api/ai/journey/`
- Migrations: `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/supabase/migrations/`
- Tests: `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/__tests__/lib/ai/`
- Reports: `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/WORKFLOW-V2-DRAFT/INBOX/senior-dev/`

## 🏁 COMPLETION CHECKLIST
- [ ] Database migration created and applied successfully
- [ ] JourneySuggestionsEngine implemented with OpenAI integration
- [ ] Vendor journey specialist service functional
- [ ] API endpoints created with full security
- [ ] Performance tracking system operational
- [ ] TypeScript compilation successful
- [ ] All backend tests passing (>90% coverage)
- [ ] Database performance optimized
- [ ] Security requirements implemented
- [ ] Error handling comprehensive
- [ ] Audit logging functional
- [ ] Evidence package with AI generation proofs prepared
- [ ] Senior dev review prompt created

## 🔧 IMPLEMENTATION PATTERNS:

### OpenAI Integration:
```typescript
// Structured AI generation with validation
const response = await this.openai.chat.completions.create({
  model: 'gpt-4',
  messages: [{ role: 'system', content: systemPrompt }],
  response_format: { type: 'json_object' },
  temperature: 0.3,
  max_tokens: 2000
});

const journeyData = JSON.parse(response.choices[0].message.content);
return this.validateJourneyStructure(journeyData);
```

### Database Operations:
```typescript
// Store generated journey with performance tracking
const { data, error } = await supabase.rpc('store_ai_journey', {
  journey_data: journeyData,
  performance_metrics: performanceData,
  supplier_id: supplierId
});
```

### Error Handling:
```typescript
// Comprehensive error handling for AI operations
try {
  const journey = await this.generateJourney(request);
} catch (error) {
  if (error.code === 'openai_rate_limit') {
    throw new RateLimitError('AI generation rate limit exceeded');
  } else if (error.code === 'openai_invalid_response') {
    throw new AIValidationError('Invalid AI response structure');
  }
  throw new JourneyGenerationError('Failed to generate journey');
}
```

---

**EXECUTE IMMEDIATELY - This is a comprehensive prompt with all requirements for building the complete AI journey suggestions backend system with OpenAI integration and vendor-specific logic!**