# TEAM B - ROUND 1: WS-219 - Google Places Integration
## 2025-01-20 - Development Round 1

**YOUR MISSION:** Build secure Google Places API integration backend with rate limiting, caching, and database storage for wedding venue and vendor data
**FEATURE ID:** WS-219 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round  
**THINK ULTRA HARD** about Google Places API security, rate limiting, and wedding venue data management

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/lib/integrations/google-places-client.ts
ls -la $WS_ROOT/wedsync/src/lib/services/places-search-service.ts
ls -la $WS_ROOT/wedsync/src/app/api/places/search/route.ts
ls -la $WS_ROOT/wedsync/src/app/api/places/details/route.ts
cat $WS_ROOT/wedsync/src/app/api/places/search/route.ts | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test places/api
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

// Query existing API patterns and integration services
await mcp__serena__search_for_pattern("api.*integration");
await mcp__serena__find_symbol("withSecureValidation", "", true);
await mcp__serena__get_symbols_overview("src/app/api");
await mcp__serena__search_for_pattern("rate.*limit");
```

### B. REF MCP CURRENT DOCS (MINUTES 3-5)
```typescript
// Load Google Places API backend documentation
await mcp__Ref__ref_search_documentation("Google Places API server side integration");
await mcp__Ref__ref_search_documentation("Next.js API routes rate limiting");
await mcp__Ref__ref_search_documentation("PostgreSQL spatial queries geolocation");
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR COMPLEX API DESIGN

### Use Sequential Thinking MCP for Backend Architecture
```typescript
mcp__sequential-thinking__sequential_thinking({
  thought: "This Google Places API backend integration requires: 1) Secure API key management with server-side proxy routes, 2) Rate limiting to prevent API quota exhaustion, 3) Intelligent caching strategy for frequently searched venues, 4) Database schema for storing wedding venue data, 5) Integration with existing wedding coordination workflows. I need to design this for 1000+ concurrent wedding planners while maintaining sub-second response times.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 6
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

Launch these agents with comprehensive requirements:

1. **task-tracker-coordinator** - Break down Google Places API backend development
2. **api-architect** - Design secure Places API integration patterns
3. **database-mcp-specialist** - Create venue storage and caching schema
4. **security-compliance-officer** - Enforce API security and rate limiting
5. **performance-optimization-expert** - Optimize Places API response times
6. **documentation-chronicler** - Document Places API integration patterns

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### API ROUTE SECURITY CHECKLIST:
- [ ] **Google Places API key protection** - Store in environment variables, never expose to client
- [ ] **withSecureValidation middleware** - Validate all search parameters
- [ ] **Authentication check** - getServerSession() for all Places endpoints
- [ ] **Rate limiting** - Implement per-user and global rate limits for Google Places calls
- [ ] **Input sanitization** - secureStringSchema for all venue search queries
- [ ] **XSS prevention** - Sanitize all venue data from Google Places API
- [ ] **SQL injection prevention** - Use parameterized queries for venue storage
- [ ] **API quota management** - Track and limit Google Places API usage
- [ ] **Error messages sanitized** - Never leak Google Places API keys or internal errors
- [ ] **Audit logging** - Log all venue searches with user context and wedding ID

### GOOGLE PLACES SPECIFIC SECURITY:
- [ ] **Session token management** - Proper Google Places session tokens for autocomplete
- [ ] **Request signing** - HMAC signing for sensitive venue data
- [ ] **IP restrictions** - Whitelist server IPs for Google Places API
- [ ] **Referrer validation** - Validate all requests come from legitimate wedding planning flows

## 🧭 DATABASE SCHEMA REQUIREMENTS (MANDATORY)

### Google Places Integration Tables:
```sql
-- Google Places API configuration and usage tracking
CREATE TABLE IF NOT EXISTS google_places_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_encrypted TEXT NOT NULL,
  daily_quota_limit INTEGER DEFAULT 1000,
  current_usage INTEGER DEFAULT 0,
  usage_reset_date DATE DEFAULT CURRENT_DATE,
  rate_limit_per_minute INTEGER DEFAULT 60,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Cache for Google Places data to reduce API calls
CREATE TABLE IF NOT EXISTS google_places_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id VARCHAR(255) NOT NULL UNIQUE,
  place_data JSONB NOT NULL,
  place_type TEXT NOT NULL CHECK (place_type IN ('venue', 'vendor', 'accommodation', 'restaurant')),
  name TEXT NOT NULL,
  address TEXT,
  coordinates POINT,
  last_refreshed_at TIMESTAMP DEFAULT NOW(),
  cache_expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Track places associated with wedding events
CREATE TABLE IF NOT EXISTS wedding_places (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID REFERENCES couples(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  place_id VARCHAR(255) REFERENCES google_places_cache(place_id),
  wedding_role TEXT NOT NULL CHECK (wedding_role IN (
    'ceremony_venue', 'reception_venue', 'accommodation', 
    'rehearsal_venue', 'vendor_meeting', 'getting_ready_location'
  )),
  is_primary BOOLEAN DEFAULT false,
  booking_status TEXT DEFAULT 'considering' CHECK (booking_status IN ('considering', 'contacted', 'booked', 'rejected')),
  notes TEXT,
  added_at TIMESTAMP DEFAULT NOW()
);
```

## 🎯 TEAM B SPECIALIZATION: BACKEND/API FOCUS

**BACKEND/API FOCUS:**
- Google Places API integration with secure server-side proxy
- Database operations for venue caching and wedding place storage
- withSecureValidation middleware for all Places endpoints
- Authentication and comprehensive rate limiting
- Error handling and structured logging for API debugging
- Business logic for wedding venue management workflows

## 📋 TECHNICAL SPECIFICATION: WS-219 Google Places Integration

### WEDDING CONTEXT & BACKEND REQUIREMENTS
Wedding planners need reliable, fast access to venue information during client meetings. The backend must handle 100+ concurrent searches during peak wedding season while maintaining Google Places API quota limits and ensuring data accuracy for wedding coordination.

### API ENDPOINTS TO BUILD:

1. **GET /api/places/search** - Places autocomplete and text search
   ```typescript
   interface GooglePlacesSearchRequest {
     query: string;
     type?: 'autocomplete' | 'text_search';
     location?: { lat: number; lng: number };
     radius?: number;
     placeTypes?: string[];
     country?: string;
     sessionToken?: string;
   }
   ```

2. **GET /api/places/details/{placeId}** - Comprehensive place information
   ```typescript
   interface GooglePlaceDetailsRequest {
     placeId: string;
     fields?: string[];
     sessionToken?: string;
   }
   ```

3. **GET /api/places/nearby** - Location-based vendor discovery
   ```typescript
   interface GoogleNearbySearchRequest {
     location: { lat: number; lng: number };
     radius: number;
     type?: string;
     keyword?: string;
   }
   ```

4. **POST /api/places/wedding-places** - Add place to wedding
   ```typescript
   interface AddWeddingPlaceRequest {
     placeId: string;
     weddingRole: 'ceremony_venue' | 'reception_venue' | 'accommodation';
     isPrimary?: boolean;
     bookingStatus?: 'considering' | 'contacted' | 'booked';
     notes?: string;
   }
   ```

### BACKEND SERVICES TO BUILD:

1. **GooglePlacesClient** - Core API integration
   - Secure API key management
   - Request/response handling with error recovery
   - Session token management for autocomplete
   - Rate limiting and quota tracking

2. **PlacesSearchService** - Business logic layer
   - Search result processing and filtering
   - Wedding-specific place categorization
   - Duplicate detection and merging
   - Cache management and invalidation

3. **WeddingPlacesService** - Wedding coordination integration
   - Place assignment to wedding events
   - Venue conflict detection
   - Timeline integration for travel times
   - Supplier notification workflows

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1

### Core API Integration:
- [ ] google-places-client.ts - Secure Google Places API wrapper
- [ ] places-search-service.ts - Business logic for venue search
- [ ] All 4 API route handlers with comprehensive validation
- [ ] Database migrations for Places integration tables

### Security & Performance:
- [ ] withSecureValidation middleware for all endpoints
- [ ] Rate limiting implementation (per-user and global)
- [ ] Google Places API quota tracking and alerting
- [ ] Comprehensive error handling and logging

### Wedding Integration:
- [ ] wedding-places-service.ts - Venue assignment to weddings
- [ ] Integration with existing wedding coordination workflows
- [ ] Supplier notification when venues are selected
- [ ] Timeline integration for venue-based scheduling

### Testing & Monitoring:
- [ ] Unit tests for all services (>95% coverage)
- [ ] Integration tests with Google Places API mocking
- [ ] Performance tests for concurrent search load
- [ ] API monitoring and health checks

## 💾 WHERE TO SAVE YOUR WORK
- API Integration: `$WS_ROOT/wedsync/src/lib/integrations/`
- Business Logic: `$WS_ROOT/wedsync/src/lib/services/`
- API Routes: `$WS_ROOT/wedsync/src/app/api/places/`
- Database Migrations: `$WS_ROOT/wedsync/supabase/migrations/`
- Tests: `$WS_ROOT/wedsync/src/lib/integrations/__tests__/`
- Type Definitions: `$WS_ROOT/wedsync/src/types/google-places.ts`

## 🏁 COMPLETION CHECKLIST
- [ ] All Google Places API integration files created and verified
- [ ] TypeScript compilation successful with no errors
- [ ] All tests passing (unit, integration, performance)
- [ ] Security requirements implemented (API key protection, validation)
- [ ] Rate limiting and quota management functional
- [ ] Database schema created and migrated successfully
- [ ] Wedding venue assignment workflows integrated
- [ ] API monitoring and logging implemented
- [ ] Evidence package prepared with API testing results
- [ ] Senior dev review prompt created with API demonstration

## 🎯 WEDDING INDUSTRY CONTEXT REQUIREMENTS

Every Google Places API integration must support:
- **Peak Season Load** - Handle 1000+ concurrent wedding planners during busy season
- **International Venues** - Support global venue search for destination weddings
- **Real-time Coordination** - Fast venue data for time-sensitive wedding planning
- **Data Accuracy** - Ensure venue information is current for wedding day logistics
- **Multi-vendor Support** - Search for venues, caterers, florists, photographers simultaneously
- **Offline Resilience** - Cache frequently accessed venue data for reliability

---

**EXECUTE IMMEDIATELY - Build secure, scalable Google Places API backend for wedding venue coordination!**