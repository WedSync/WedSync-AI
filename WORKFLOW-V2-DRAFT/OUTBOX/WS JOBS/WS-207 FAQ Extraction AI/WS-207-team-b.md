# TEAM B - ROUND 1: WS-207 - FAQ Extraction AI
## 2025-01-20 - Development Round 1

**YOUR MISSION:** Build the complete backend FAQ extraction system with website scraping, AI categorization, and secure API endpoints with database storage
**FEATURE ID:** WS-207 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round  
**THINK ULTRA HARD** about website scraping security, AI text processing, and wedding vendor FAQ patterns

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la /Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/lib/scraping/website-scraper.ts
ls -la /Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/app/api/faq/extract/route.ts
ls -la /Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/supabase/migrations/
cat /Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/lib/scraping/website-scraper.ts | head -20
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

// Query specific areas relevant to scraping and AI
await mcp__serena__search_for_pattern("scraping");
await mcp__serena__find_symbol("Playwright", "", true);
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
await mcp__Ref__ref_search_documentation("Playwright web scraping");
await mcp__Ref__ref_search_documentation("OpenAI text processing");
await mcp__Ref__ref_search_documentation("Next.js API routes security");
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR COMPLEX FEATURE PLANNING

### Use Sequential Thinking MCP for Complex Analysis
```typescript
mcp__sequential-thinking__sequentialthinking({
  thought: "The FAQ extraction system requires: 1) Secure website scraping with Playwright, 2) HTML parsing to identify FAQ sections, 3) AI processing to categorize and structure FAQs, 4) Database schema for storing extracted FAQs, 5) API endpoints with rate limiting and validation. I need to ensure security, handle various website structures, and optimize for wedding vendor patterns.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 6
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

Launch these agents with comprehensive requirements:

1. **database-mcp-specialist** - Design FAQ extraction database schema
2. **security-compliance-officer** - Secure scraping and API endpoints
3. **code-quality-guardian** - Maintain backend code standards and testing
4. **performance-optimization-expert** - Optimize scraping and AI processing
5. **test-automation-architect** - Create comprehensive backend tests
6. **documentation-chronicler** - Document scraping and AI architecture

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### API ROUTE SECURITY CHECKLIST:
- [ ] **Zod validation on EVERY input** - Use withSecureValidation middleware
- [ ] **Authentication check** - getServerSession() for protected routes
- [ ] **Rate limiting applied** - rateLimitService.checkRateLimit() for scraping requests
- [ ] **SQL injection prevention** - secureStringSchema for all strings
- [ ] **XSS prevention** - HTML encode all scraped content
- [ ] **CSRF protection** - Automatic with Next.js App Router
- [ ] **URL validation** - Prevent scraping internal/localhost URLs
- [ ] **Content sanitization** - Clean all scraped HTML before storing
- [ ] **Audit logging** - Log all scraping requests with user context
- [ ] **Timeout handling** - Prevent long-running scraping operations

## 🎯 TEAM B SPECIALIZATION:

**BACKEND/API FOCUS:**
- API endpoints with security validation
- Website scraping and HTML parsing
- Database operations and migrations
- withSecureValidation middleware required
- Authentication and rate limiting
- Error handling and logging
- Business logic implementation

## 📋 TECHNICAL SPECIFICATION
**Real Wedding Scenario:**
A wedding photographer wants to import 50+ FAQs from their existing website. The backend system scrapes their FAQ page, identifies Q&A pairs using AI pattern recognition, categorizes them by wedding topics (pricing, timeline, deliverables), stores them in the database, and returns structured data for frontend review - all within 30 seconds while maintaining security.

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1

### PRIMARY BACKEND COMPONENTS (MUST BUILD):

#### 1. Database Migration for FAQ System
**Location:** `supabase/migrations/[timestamp]_faq_extraction_system.sql`

**Schema Implementation:**
```sql
-- FAQ categories for wedding vendors
CREATE TABLE IF NOT EXISTS faq_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  keywords TEXT[] DEFAULT ARRAY[]::TEXT[],
  color TEXT DEFAULT '#3B82F6',
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Extracted FAQs storage
CREATE TABLE IF NOT EXISTS faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  category_id UUID REFERENCES faq_categories(id) ON DELETE SET NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  source_url TEXT,
  extraction_metadata JSONB DEFAULT '{}'::jsonb,
  ai_confidence_score DECIMAL(3,2),
  ai_suggested_category TEXT,
  is_approved BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE
);

-- FAQ extraction jobs tracking
CREATE TABLE IF NOT EXISTS faq_extraction_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  website_url TEXT NOT NULL,
  status TEXT CHECK (status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
  total_pages INTEGER DEFAULT 0,
  processed_pages INTEGER DEFAULT 0,
  extracted_faqs_count INTEGER DEFAULT 0,
  error_message TEXT,
  extraction_log JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Performance indexes
CREATE INDEX idx_faqs_supplier ON faqs(supplier_id);
CREATE INDEX idx_faqs_category ON faqs(category_id);
CREATE INDEX idx_faqs_approved ON faqs(supplier_id, is_approved);
CREATE INDEX idx_extraction_jobs_supplier ON faq_extraction_jobs(supplier_id);
CREATE INDEX idx_extraction_jobs_status ON faq_extraction_jobs(status);
```

#### 2. Website Scraper Service
**Location:** `src/lib/scraping/website-scraper.ts`

**Core Features:**
- Playwright-based website scraping
- FAQ pattern detection and extraction
- HTML parsing and content cleaning
- Multiple website structure support
- Error handling and retry logic
- Performance monitoring and logging

**Implementation Pattern:**
```typescript
export class WebsiteScraper {
  private browser: Browser | null = null;
  private auditLogger: AuditLogger;
  
  constructor() {
    this.auditLogger = new AuditLogger();
  }
  
  async extractFAQs(websiteUrl: string, supplierId: string): Promise<ExtractedFAQ[]> {
    // Initialize Playwright browser
    // Navigate to website with security checks
    // Discover FAQ pages
    // Extract FAQ content with pattern matching
    // Clean and structure data
    // Return extracted FAQs
  }
  
  private async discoverFAQPages(page: Page): Promise<string[]> {
    // Look for FAQ-related links and sections
    // Common patterns: /faq, /questions, /help, FAQ sections
    return faqUrls;
  }
  
  private async extractFAQsFromPage(page: Page): Promise<ExtractedFAQ[]> {
    // Multiple extraction strategies for different site structures
    return faqs;
  }
}
```

#### 3. FAQ AI Processor
**Location:** `src/lib/ai/faq-processor.ts`

**Features:**
- OpenAI integration for FAQ categorization
- Wedding vendor context awareness
- Content quality assessment
- Duplicate detection and merging
- Category suggestion with confidence scores

**Wedding-Specific Categories:**
```typescript
const WEDDING_FAQ_CATEGORIES = {
  pricing: {
    keywords: ['price', 'cost', 'package', 'payment', 'budget', 'fee'],
    description: 'Pricing and payment related questions'
  },
  timeline: {
    keywords: ['schedule', 'timeline', 'delivery', 'turnaround', 'when'],
    description: 'Timeline and delivery questions'
  },
  services: {
    keywords: ['include', 'service', 'offer', 'provide', 'coverage'],
    description: 'Services and offerings questions'
  },
  booking: {
    keywords: ['book', 'reserve', 'available', 'date', 'contract'],
    description: 'Booking and availability questions'
  },
  planning: {
    keywords: ['plan', 'coordinate', 'organize', 'meeting', 'consultation'],
    description: 'Wedding planning process questions'
  }
};
```

#### 4. API Endpoints
**Location:** `src/app/api/faq/extract/route.ts`

**Endpoints to Build:**
- `POST /api/faq/extract` - Start FAQ extraction from website
- `GET /api/faq/extract/status/:jobId` - Check extraction job status
- `POST /api/faq/categorize` - AI categorization of extracted FAQs
- `POST /api/faq/approve` - Approve extracted FAQs

**Security Implementation:**
```typescript
export async function POST(request: NextRequest) {
  try {
    // 1. Authentication check
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Rate limiting for scraping operations
    await rateLimitService.checkRateLimit(session.user.id, 'faq_extraction', 5);

    // 3. Input validation
    const body = await request.json();
    const validatedData = FAQExtractionRequestSchema.parse(body);

    // 4. Validate URL security
    if (!isValidWebsiteUrl(validatedData.websiteUrl)) {
      return NextResponse.json({ error: 'Invalid website URL' }, { status: 400 });
    }

    // 5. Start extraction job
    const scraper = new WebsiteScraper();
    const jobId = await scraper.startExtractionJob({
      ...validatedData,
      supplierId: session.user.id
    });

    // 6. Audit logging
    await auditLogger.log({
      action: 'FAQ_EXTRACTION_STARTED',
      userId: session.user.id,
      metadata: { websiteUrl: validatedData.websiteUrl, jobId }
    });

    return NextResponse.json({ jobId });
  } catch (error) {
    return handleApiError(error);
  }
}
```

#### 5. FAQ Content Processor
**Location:** `src/lib/ai/faq-content-processor.ts`

**Features:**
- HTML content sanitization
- FAQ structure validation
- Content quality scoring
- Duplicate detection algorithms
- Wedding industry context enhancement

### DATABASE REQUIREMENTS:
- [ ] Complete migration for FAQ extraction schema
- [ ] Indexes for performance optimization
- [ ] Foreign key constraints for data integrity
- [ ] JSONB fields for flexible metadata storage
- [ ] Job tracking system for async processing

### API SECURITY REQUIREMENTS:
- [ ] All endpoints protected with authentication
- [ ] Input validation with Zod schemas
- [ ] Rate limiting on extraction endpoints
- [ ] URL validation to prevent SSRF attacks
- [ ] Content sanitization for scraped HTML
- [ ] Comprehensive audit logging

### SCRAPING REQUIREMENTS:
- [ ] Playwright integration with headless browser
- [ ] Multiple FAQ page detection strategies
- [ ] HTML parsing with fallback patterns
- [ ] Error handling for failed extractions
- [ ] Timeout protection for long operations

### TESTING REQUIREMENTS:
- [ ] Unit tests for WebsiteScraper (>90% coverage)
- [ ] Integration tests for API endpoints
- [ ] Database migration tests
- [ ] Mock website testing for scraping logic
- [ ] Security penetration testing

## 💾 WHERE TO SAVE YOUR WORK
- Services: `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/lib/scraping/`
- AI Services: `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/lib/ai/`
- API Routes: `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/app/api/faq/`
- Migrations: `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/supabase/migrations/`
- Tests: `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/__tests__/lib/scraping/`
- Reports: `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/WORKFLOW-V2-DRAFT/INBOX/senior-dev/`

## 🏁 COMPLETION CHECKLIST
- [ ] Database migration created and applied successfully
- [ ] WebsiteScraper service implemented with Playwright
- [ ] API endpoints created with full security
- [ ] FAQ AI processor working with categorization
- [ ] TypeScript compilation successful
- [ ] All backend tests passing (>90% coverage)
- [ ] Database performance optimized
- [ ] Security requirements implemented
- [ ] Error handling comprehensive
- [ ] Audit logging functional
- [ ] Evidence package with scraping proofs prepared
- [ ] Senior dev review prompt created

## 🔧 IMPLEMENTATION PATTERNS:

### Playwright Scraping:
```typescript
// Safe website scraping with timeout
const page = await browser.newPage();
await page.setDefaultTimeout(30000);
await page.goto(url, { waitUntil: 'networkidle' });

// Extract FAQ content with multiple strategies
const faqs = await page.evaluate(() => {
  // Strategy 1: Look for FAQ schema markup
  // Strategy 2: Common FAQ HTML patterns
  // Strategy 3: Q&A text pattern matching
  return extractedFAQs;
});
```

### Database Transactions:
```typescript
// Use transactions for consistency
const { data, error } = await supabase.rpc('create_extraction_job', {
  job_data: jobData,
  extracted_faqs: faqsData
});
```

### Error Handling:
```typescript
// Comprehensive error handling
try {
  const faqs = await scraper.extractFAQs(url);
} catch (error) {
  if (error.code === 'PLAYWRIGHT_TIMEOUT') {
    throw new ScrapingTimeoutError('Website extraction timed out');
  }
  throw new FAQExtractionError('Failed to extract FAQs');
}
```

---

**EXECUTE IMMEDIATELY - This is a comprehensive prompt with all requirements for building the complete FAQ extraction backend system with web scraping and AI processing!**