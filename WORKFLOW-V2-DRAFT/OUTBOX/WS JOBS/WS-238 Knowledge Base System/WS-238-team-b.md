# TEAM B - ROUND 1: WS-238 - Knowledge Base System
## 2025-01-20 - Development Round 1

**YOUR MISSION:** Build secure, high-performance backend API system for wedding supplier knowledge base with AI-powered search, content management, and usage analytics
**FEATURE ID:** WS-238 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round  
**THINK ULTRA HARD** about search performance optimization, content security, and wedding industry-specific categorization

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/app/api/knowledge-base/
ls -la $WS_ROOT/wedsync/supabase/migrations/
cat $WS_ROOT/wedsync/src/app/api/knowledge-base/search/route.ts | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test api/knowledge-base
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

// Query existing API patterns and database schemas
await mcp__serena__search_for_pattern("api.*route|database.*schema|search.*implementation");
await mcp__serena__find_symbol("withSecureValidation", "", true);
await mcp__serena__get_symbols_overview("src/app/api/");
```

### B. API SECURITY & DATABASE PATTERNS (MANDATORY FOR BACKEND WORK)
```typescript
// CRITICAL: Load security middleware and validation patterns
await mcp__serena__read_file("$WS_ROOT/wedsync/src/lib/middleware/withSecureValidation.ts");
await mcp__serena__read_file("$WS_ROOT/wedsync/src/lib/validation/schemas.ts");
```

### C. REF MCP CURRENT DOCS (MINUTES 3-5)
```typescript
// Load documentation for search optimization and content management APIs
# Use Ref MCP to search for latest patterns in search APIs and content management
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR COMPLEX FEATURE PLANNING

### Use Sequential Thinking MCP for Complex Analysis
```typescript
// Use for complex backend architecture decisions
mcp__sequential-thinking__sequential_thinking({
  thought: "This knowledge base backend needs to handle: 1) Fast search with AI embeddings, 2) Content management with version control, 3) Usage analytics for improvement, 4) Secure API endpoints with rate limiting, 5) Wedding industry-specific categorization. The main challenge is optimizing search performance while maintaining security and proper content access control.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 5
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

Launch these agents with comprehensive requirements:

1. **task-tracker-coordinator** - Break down API endpoints and database operations
2. **postgresql-database-expert** - Design knowledge base schema and search optimization
3. **security-compliance-officer** - Ensure API security and content access control
4. **code-quality-guardian** - Maintain backend code standards and performance
5. **test-automation-architect** - Comprehensive API testing strategy
6. **documentation-chronicler** - API documentation and database schema docs

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### API ROUTE SECURITY CHECKLIST:
- [ ] **Zod validation on EVERY input** - Use withSecureValidation middleware
- [ ] **Authentication check** - getServerSession() for protected routes
- [ ] **Rate limiting applied** - rateLimitService.checkRateLimit() for search endpoints
- [ ] **SQL injection prevention** - secureStringSchema for all search queries
- [ ] **XSS prevention** - HTML encode all article content output
- [ ] **CSRF protection** - Automatic with Next.js App Router
- [ ] **Error messages sanitized** - Never leak database/system errors to clients
- [ ] **Audit logging** - Log search queries and content access with user context
- [ ] **Content access control** - Verify user permissions for article access
- [ ] **API key validation** - Secure internal API communication

## 🧭 DATABASE DESIGN REQUIREMENTS (MANDATORY)

### Knowledge Base Schema Implementation:
```sql
-- Core articles table with wedding industry optimization
CREATE TABLE kb_articles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  content TEXT NOT NULL,
  content_html TEXT,
  summary TEXT,
  excerpt TEXT,
  
  -- Wedding industry categorization
  category kb_category_enum NOT NULL, -- 'photography', 'venues', 'catering', 'planning', etc.
  subcategory VARCHAR(100),
  supplier_types TEXT[], -- Which supplier types this applies to
  difficulty_level difficulty_enum DEFAULT 'beginner',
  
  -- Search optimization
  search_vector tsvector, -- Full-text search vector
  keywords TEXT[],
  tags TEXT[],
  
  -- Content management
  status article_status_enum DEFAULT 'draft',
  author_id UUID REFERENCES users(id),
  reviewer_id UUID REFERENCES users(id),
  published_at TIMESTAMPTZ,
  version INTEGER DEFAULT 1,
  
  -- Analytics and feedback
  view_count INTEGER DEFAULT 0,
  helpful_count INTEGER DEFAULT 0,
  not_helpful_count INTEGER DEFAULT 0,
  average_rating DECIMAL(3,2) DEFAULT 0.0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Search analytics and optimization
CREATE TABLE kb_search_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID REFERENCES users(id) NOT NULL,
  search_query TEXT NOT NULL,
  search_filters JSONB DEFAULT '{}'::JSONB,
  results_count INTEGER NOT NULL,
  clicked_article_id UUID REFERENCES kb_articles(id),
  search_duration_ms INTEGER,
  found_helpful BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User feedback and ratings
CREATE TABLE kb_article_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id UUID REFERENCES kb_articles(id) NOT NULL,
  supplier_id UUID REFERENCES users(id) NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  feedback_text TEXT,
  feedback_type feedback_type_enum, -- 'helpful', 'unclear', 'outdated', 'suggestion'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(article_id, supplier_id)
);
```

## 🎯 TEAM B SPECIALIZATION:

**BACKEND/API FOCUS:**
- API endpoints with comprehensive security validation using withSecureValidation middleware
- Database operations and migrations for knowledge base schema
- Authentication, authorization, and rate limiting for content access
- Error handling and logging for search and content operations
- Business logic implementation for AI-powered search and analytics
- Performance optimization for search queries and content delivery

## 📋 SPECIFIC DELIVERABLES FOR ROUND 1

### API Endpoints to Build:
- [ ] `GET /api/knowledge-base/search` - Intelligent search with AI embeddings
- [ ] `GET /api/knowledge-base/articles/[slug]` - Secure article retrieval
- [ ] `GET /api/knowledge-base/categories` - Category and filter data
- [ ] `POST /api/knowledge-base/feedback` - Article rating and feedback
- [ ] `GET /api/knowledge-base/suggested` - Context-aware article suggestions
- [ ] `POST /api/knowledge-base/analytics` - Search and usage analytics
- [ ] `GET /api/knowledge-base/popular` - Popular articles by supplier type
- [ ] `POST /api/knowledge-base/articles` - Admin article creation (if needed)

### Backend Logic Requirements:
- [ ] **Intelligent Search Algorithm:**
  - Full-text search with PostgreSQL tsvector
  - AI embedding similarity search for semantic matching
  - Wedding industry terminology optimization
  - Search result ranking based on supplier type and relevance
  - Search autocomplete with cached suggestions

- [ ] **Content Management System:**
  - Article version control and publishing workflow
  - Content access control based on subscription tiers
  - Automated content optimization based on user feedback
  - Content analytics and performance tracking

- [ ] **Performance Optimizations:**
  - Search result caching with Redis (if available)
  - Database indexing for fast article retrieval
  - Pagination for large result sets
  - Content compression for faster delivery

### Security and Validation:
- [ ] All API routes use withSecureValidation middleware
- [ ] Search query injection prevention
- [ ] Content access authorization
- [ ] Rate limiting for search endpoints (prevent abuse)
- [ ] Audit logging for content access and modifications
- [ ] Secure handling of user feedback and ratings

### Database Migration:
- [ ] Create comprehensive migration for knowledge base schema
- [ ] Add proper indexes for search performance
- [ ] Set up full-text search configurations
- [ ] Create enums for categories and status values
- [ ] Add proper foreign key constraints and cascading

## 💾 WHERE TO SAVE YOUR WORK
- API Routes: $WS_ROOT/wedsync/src/app/api/knowledge-base/
- Database Logic: $WS_ROOT/wedsync/src/lib/database/knowledge-base/
- Validation Schemas: $WS_ROOT/wedsync/src/lib/validation/knowledge-base.ts
- Migration: $WS_ROOT/wedsync/supabase/migrations/
- Tests: $WS_ROOT/wedsync/tests/api/knowledge-base/

## 🏁 COMPLETION CHECKLIST
- [ ] All API endpoints created and verified to exist
- [ ] TypeScript compilation successful with no errors
- [ ] All API tests passing (>90% coverage)
- [ ] Security requirements implemented (validation, auth, rate limiting)
- [ ] Database migration created and tested
- [ ] Search performance optimized (<500ms response time)
- [ ] Wedding industry categorization properly implemented
- [ ] Analytics and feedback systems operational
- [ ] Error handling and logging comprehensive
- [ ] Evidence package prepared with API test results
- [ ] Senior dev review prompt created

## 🌟 WEDDING SUPPLIER API SUCCESS SCENARIOS

**Scenario 1**: Wedding photographer searches "client questionnaire" - API returns contextually relevant articles for photography workflows within 300ms, with proper analytics tracking.

**Scenario 2**: Venue coordinator accesses an article on "event timeline management" - API validates access permissions, logs the view for analytics, and suggests 3 related articles based on venue-specific needs.

**Scenario 3**: Florist provides feedback that an article was "not helpful" - API securely processes the feedback, updates article metrics, and triggers content review workflow.

---

**EXECUTE IMMEDIATELY - This is a comprehensive backend prompt with all security and performance requirements for wedding industry knowledge base API!**