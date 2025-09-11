# TEAM B - ROUND 1: WS-216 - Auto-Population System
## 2025-01-29 - Development Round 1

**YOUR MISSION:** Build the backend infrastructure and API endpoints for the auto-population system that intelligently matches and populates vendor forms with couples' wedding data, with robust security validation and performance optimization
**FEATURE ID:** WS-216 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round  
**THINK ULTRA HARD** about field mapping algorithms, data transformation logic, and secure population session management

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/app/api/auto-population/
ls -la $WS_ROOT/wedsync/src/lib/services/
cat $WS_ROOT/wedsync/src/lib/services/auto-population-service.ts | head -20
cat $WS_ROOT/wedsync/src/app/api/auto-population/populate/route.ts | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **DATABASE MIGRATION RESULTS:**
```bash
# Verify migration applied successfully
npx supabase migration list --linked
# Show the new tables exist
```

4. **API ENDPOINT TESTS:**
```bash
npm test auto-population-api
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

// Query existing API patterns and database services
await mcp__serena__search_for_pattern("api.*route|withSecureValidation|database");
await mcp__serena__find_symbol("withSecureValidation", "", true);
await mcp__serena__get_symbols_overview("src/app/api");
await mcp__serena__get_symbols_overview("src/lib/services");
```

### B. DATABASE & API PATTERNS (MANDATORY)
```typescript
// CRITICAL: Understanding existing patterns
await mcp__serena__read_file("$WS_ROOT/wedsync/src/lib/validations");
await mcp__serena__read_file("$WS_ROOT/wedsync/src/lib/database");
```

### C. REF MCP CURRENT DOCS (MINUTES 3-5)
```typescript
// Load documentation SPECIFIC to Next.js API routes and Supabase patterns
# Use Ref MCP to search for API security, database operations, and data validation
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR COMPLEX FEATURE PLANNING

### Use Sequential Thinking MCP for Complex Analysis
```typescript
// Use for complex architectural decisions around auto-population backend
mcp__sequential-thinking__sequential_thinking({
  thought: "The auto-population system backend needs careful design. Core challenges: 1) Field pattern matching algorithm - how to map 'wedding_date' to 'event_date', 'date', 'ceremonyDate' etc. 2) Confidence scoring - mathematical model to score mapping accuracy 3) Data transformation - handle different date formats, name formats 4) Session management - secure, time-limited population sessions 5) Performance - sub-3-second population for 50+ field forms. The pattern matching is the most complex - I need fuzzy matching with weighted scoring.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 6
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

Launch these agents with comprehensive requirements:

1. **task-tracker-coordinator** - Break down backend service development
2. **database-mcp-specialist** - Handle migration creation and database operations  
3. **security-compliance-officer** - Ensure API security and data protection
4. **api-architect** - Design RESTful endpoints and data flow
5. **test-automation-architect** - Comprehensive API testing
6. **documentation-chronicler** - Document API specifications and algorithms

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### API ROUTE SECURITY CHECKLIST:
- [ ] **Zod validation on EVERY input** - Use withSecureValidation middleware
- [ ] **Authentication check** - getServerSession() for all endpoints
- [ ] **Rate limiting applied** - rateLimitService.checkRateLimit() on all routes
- [ ] **SQL injection prevention** - secureStringSchema for all strings
- [ ] **XSS prevention** - Sanitize all output data
- [ ] **CSRF protection** - Automatic with Next.js App Router
- [ ] **Error messages sanitized** - Never leak database/system information
- [ ] **Audit logging** - Log all population events with user context
- [ ] **Data masking** - Never populate sensitive fields (SSN, passwords)
- [ ] **Session encryption** - Encrypt population session data

## 🎯 TEAM B SPECIALIZATION: BACKEND/API FOCUS

**BACKEND/API FOCUS:**
- API endpoints with security validation
- Database operations and migrations  
- withSecureValidation middleware required
- Authentication and rate limiting
- Error handling and logging
- Business logic implementation
- Field mapping algorithms
- Confidence scoring calculations
- Population session management

## 📋 WS-216 TECHNICAL SPECIFICATION - BACKEND SERVICES

### REAL WEDDING SCENARIO
**Context:** Your API must handle Sarah and Mike's auto-population request. When their caterer's form arrives with fields like 'event_date', 'primary_contact_name', 'guest_headcount', your system needs to match these to their stored data ('wedding_date', 'partner1_name', 'guest_count') with high confidence, transform the data appropriately, and create a secure population session that expires in 1 hour.

### YOUR DELIVERABLES - ROUND 1

#### 1. Database Migration
```sql
-- Create the auto-population database schema
-- Tables: auto_population_rules, form_field_mappings, auto_population_sessions
-- Indexes for performance optimization
-- Foreign key constraints for data integrity
```

#### 2. Auto-Population Service
```typescript
// src/lib/services/auto-population-service.ts
// Core business logic for field matching and population
// Must handle:
// - Pattern matching algorithms (fuzzy string matching)
// - Confidence score calculations
// - Data transformation logic
// - Population rule evaluation
// - Session management
```

#### 3. API Endpoints
```typescript
// POST /api/auto-population/populate
// POST /api/auto-population/session/{sessionId}/feedback
// GET /api/auto-population/session/{sessionId}
// POST /api/auto-population/mappings
// GET /api/auto-population/mappings
// POST /api/auto-population/mappings/auto-detect
// All with comprehensive security validation
```

#### 4. Population Rules Engine
```typescript
// Pattern matching and rule evaluation system
// Handles fuzzy matching, priority resolution
// Transformation functions for different data types
// Performance-optimized for real-time population
```

## 🗄️ DATABASE SCHEMA IMPLEMENTATION

### Required Tables (From Technical Spec)
```sql
-- 1. auto_population_rules table
-- Define field mapping patterns and transformation rules
-- Support for supplier-specific and form-type-specific rules
-- Priority levels for conflict resolution

-- 2. form_field_mappings table  
-- Track supplier form fields and their core field mappings
-- Confidence scoring and usage analytics
-- AI-suggested vs manually verified mappings

-- 3. auto_population_sessions table
-- Manage active population sessions with expiration
-- Track populated fields and user corrections
-- Session status management and cleanup
```

### Performance Indexes Required
```sql
-- Optimized queries for real-time population
CREATE INDEX idx_auto_population_rules_source ON auto_population_rules(source_field_key);
CREATE INDEX idx_form_field_mappings_supplier ON form_field_mappings(supplier_id, form_identifier);
CREATE INDEX idx_auto_population_sessions_couple ON auto_population_sessions(couple_id);
-- Additional indexes for pattern matching performance
```

## 🔧 TECHNICAL ALGORITHMS

### Field Pattern Matching Algorithm
```typescript
// Fuzzy string matching with weighted scoring
// Pattern examples:
// 'wedding_date' matches: 'event_date' (0.8), 'date' (0.6), 'ceremonyDate' (0.9)
// 'guest_count' matches: 'number_of_guests' (0.9), 'headcount' (0.7), 'attendees' (0.6)

interface MatchingConfig {
  exactMatch: number;      // 1.0 for perfect matches
  partialMatch: number;    // 0.7 for partial word matches
  synonymMatch: number;    // 0.8 for known synonyms
  patternMatch: number;    // 0.6 for regex pattern matches
  minimumConfidence: number; // 0.5 threshold for suggestions
}
```

### Confidence Scoring System
```typescript
// Multi-factor confidence calculation
interface ConfidenceFactors {
  stringMatchScore: number;    // 0.0-1.0 based on string similarity
  patternMatchScore: number;   // 0.0-1.0 based on regex patterns
  contextMatchScore: number;   // 0.0-1.0 based on supplier type/form type
  historicalAccuracy: number;  // 0.0-1.0 based on past success rate
  userFeedbackScore: number;   // 0.0-1.0 based on previous corrections
}

// Final confidence = weighted average with contextual adjustments
```

### Data Transformation Logic
```typescript
// Handle different data formats and types
interface TransformationRules {
  dateFormats: string[];      // ['YYYY-MM-DD', 'MM/DD/YYYY', 'DD/MM/YYYY']
  phoneFormats: string[];     // ['(XXX) XXX-XXXX', 'XXX-XXX-XXXX', '+1XXXXXXXXXX']
  nameFormats: string[];      // ['First Last', 'Last, First', 'First M. Last']
  addressFormats: string[];   // Various address formatting rules
}
```

## 🏗️ API ENDPOINT SPECIFICATIONS

### 1. Population Endpoint
```typescript
// POST /api/auto-population/populate
// Core functionality: match form fields and populate with couple's data
// Security: Authentication required, rate limited, input validation
// Performance: <3 second response time for 50+ fields
// Error handling: Graceful degradation with partial populations

interface PopulateFormRequest {
  supplierId: string;           // Validated UUID
  formIdentifier: string;       // Sanitized string
  formFields: FormFieldDefinition[]; // Validated array
  populationPreferences?: {     // Optional settings
    onlyRequiredFields?: boolean;
    skipConfidentialFields?: boolean;
    maxAge?: number;
  };
}
```

### 2. Session Management
```typescript
// GET /api/auto-population/session/{sessionId}
// Retrieve active population session details
// Security: Session ownership validation
// Performance: Cached session data

// POST /api/auto-population/session/{sessionId}/feedback
// Collect user feedback on population accuracy
// Security: Session validation and user authorization
// Analytics: Track accuracy metrics for improvement
```

### 3. Mapping Management
```typescript
// POST /api/auto-population/mappings
// Create/update field mappings for supplier forms
// Security: Supplier authorization required
// Validation: Comprehensive input sanitization

// POST /api/auto-population/mappings/auto-detect
// AI-powered field mapping suggestions
// Security: Rate limited to prevent abuse
// Performance: Asynchronous processing for large forms
```

## 🔐 SECURITY IMPLEMENTATION DETAILS

### Input Validation Schemas
```typescript
// Zod schemas for all API inputs
const PopulateFormSchema = z.object({
  supplierId: secureUuidSchema,
  formIdentifier: secureStringSchema.max(100),
  formFields: z.array(FormFieldSchema).max(200), // Prevent DoS attacks
  populationPreferences: PopulationPreferencesSchema.optional()
});
```

### Rate Limiting Configuration
```typescript
// Different limits for different endpoints
const rateLimits = {
  populate: { requests: 10, window: '1m' },     // 10 populations per minute
  mappings: { requests: 50, window: '1h' },     // 50 mapping operations per hour
  feedback: { requests: 20, window: '5m' }      // 20 feedback submissions per 5 minutes
};
```

### Audit Logging
```typescript
// Comprehensive logging for security monitoring
interface PopulationAuditLog {
  timestamp: string;
  userId: string;
  supplierId: string;
  action: 'populate' | 'feedback' | 'mapping';
  fieldsPopulated: string[];
  sessionId: string;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  errorCode?: string;
}
```

## 💾 WHERE TO SAVE YOUR WORK
- Services: `$WS_ROOT/wedsync/src/lib/services/auto-population-service.ts`
- API Routes: `$WS_ROOT/wedsync/src/app/api/auto-population/*/route.ts`
- Validations: `$WS_ROOT/wedsync/src/lib/validations/auto-population-schemas.ts`
- Types: `$WS_ROOT/wedsync/src/types/auto-population.ts`
- Migrations: `$WS_ROOT/wedsync/supabase/migrations/`
- Tests: `$WS_ROOT/wedsync/__tests__/api/auto-population/`

## 🧪 TESTING REQUIREMENTS

### Unit Tests Required
- Field pattern matching algorithms
- Confidence scoring calculations
- Data transformation functions
- Population rule evaluation
- Session management logic

### API Tests Required
- All endpoint security validation
- Request/response data integrity
- Error handling scenarios
- Rate limiting behavior
- Session expiration handling

### Database Tests Required
- Migration rollback/rollforward
- Query performance optimization
- Concurrent session handling
- Data consistency validation
- Index effectiveness

## 🏁 COMPLETION CHECKLIST

### Database Implementation
- [ ] Auto-population migration created and applied
- [ ] All 3 required tables with proper constraints
- [ ] Performance indexes implemented
- [ ] Sample population rules inserted
- [ ] Migration tested (up/down)

### Core Services
- [ ] auto-population-service.ts with pattern matching
- [ ] Confidence scoring algorithm implemented
- [ ] Data transformation logic for common types
- [ ] Population session management
- [ ] Error handling and logging

### API Endpoints
- [ ] POST /api/auto-population/populate (secure)
- [ ] GET/POST session management endpoints
- [ ] POST /api/auto-population/mappings (secure)
- [ ] All endpoints use withSecureValidation
- [ ] Rate limiting implemented on all routes

### Security & Performance
- [ ] Input validation with Zod schemas
- [ ] Authentication checks on all endpoints
- [ ] SQL injection prevention
- [ ] Audit logging implemented
- [ ] <3 second response times for typical requests

### Testing & Documentation
- [ ] Unit tests written and passing (>90% coverage)
- [ ] API endpoint tests with security scenarios
- [ ] TypeScript compilation successful
- [ ] API documentation with examples
- [ ] Error response documentation

## 🎯 SUCCESS CRITERIA

1. **Functionality**: API can populate 80%+ of common form fields accurately
2. **Performance**: Population completes in <3 seconds for 50+ field forms
3. **Security**: All endpoints properly secured with validation and rate limiting
4. **Reliability**: Handles edge cases gracefully with proper error responses
5. **Scalability**: Database queries optimized for high-volume usage
6. **Accuracy**: Confidence scoring reflects actual population accuracy
7. **Auditability**: Complete logging for security and analytics

---

**EXECUTE IMMEDIATELY - This is a comprehensive prompt with all backend requirements for the WS-216 Auto-Population System!**

**Remember: This system enables couples to save 3-4 hours per vendor by eliminating repetitive data entry. Your backend must be bulletproof, secure, and blazing fast to deliver on this promise.**