# TEAM B - ROUND 1: WS-294 - API Architecture Main Overview
## 2025-09-03 - Development Round 1

**YOUR MISSION:** Implement comprehensive RESTful API architecture with type-safe middleware, authentication, rate limiting, and wedding-focused endpoints
**FEATURE ID:** WS-294 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round  
**THINK ULTRA HARD** about API scalability, security, performance, and wedding industry data patterns

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/app/api/
cat $WS_ROOT/wedsync/src/app/api/middleware/auth.ts | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test api middleware authentication
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

// Query existing API routes and middleware patterns
await mcp__serena__search_for_pattern("api routes middleware authentication rate limiting");
await mcp__serena__find_symbol("middleware auth", "", true);
await mcp__serena__get_symbols_overview("$WS_ROOT/wedsync/src/app/api/");
```

### B. API SECURITY & VALIDATION STANDARDS (MANDATORY FOR BACKEND WORK)
```typescript
// CRITICAL: Load security and validation patterns
await mcp__serena__read_file("$WS_ROOT/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");

// Load existing API patterns for consistency
await mcp__serena__search_for_pattern("zod validation middleware security patterns");
```

### C. REF MCP CURRENT DOCS (MINUTES 3-5)
```typescript
// Load documentation SPECIFIC to Next.js API routes and middleware
mcp__Ref__ref_search_documentation("Next.js 15 App Router API routes middleware authentication TypeScript patterns");
mcp__Ref__ref_search_documentation("wedding software API backend architecture database operations Supabase integration");
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR COMPLEX API ARCHITECTURE

### Use Sequential Thinking MCP for Complex Backend Architecture Planning
```typescript
// Use for comprehensive API architecture decisions
mcp__sequential-thinking__sequentialthinking({
  thought: "API architecture for wedding software requires multi-tenant security (supplier isolation), wedding-specific rate limiting (higher limits during wedding season), and data validation that understands wedding industry patterns like venue bookings, vendor coordination, and couple preferences",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 6
});

mcp__sequential-thinking__sequentialthinking({
  thought: "Wedding industry has unique performance requirements: Saturday wedding days need <100ms API responses, vendor coordination APIs need real-time capabilities, and couple onboarding APIs need to handle bulk data imports from existing systems",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 6
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

Launch these agents with comprehensive backend requirements:

1. **task-tracker-coordinator** - Break down API architecture work, track endpoint implementation
2. **security-compliance-officer** - Use Serena for security pattern consistency  
3. **code-quality-guardian** - Maintain API code quality and performance standards
4. **test-automation-architect** - Comprehensive API testing (unit, integration, load)
5. **supabase-specialist** - Database integration and RLS policy implementation
6. **documentation-chronicler** - Evidence-based API architecture documentation

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### API ARCHITECTURE SECURITY CHECKLIST:
- [ ] **Zod validation on EVERY input** - Use withSecureValidation middleware
- [ ] **Authentication check** - getServerSession() for protected routes
- [ ] **Rate limiting applied** - rateLimitService.checkRateLimit()
- [ ] **SQL injection prevention** - secureStringSchema for all strings
- [ ] **Multi-tenant data isolation** - Supplier data separation enforced
- [ ] **CORS configuration** - Proper origin restrictions for wedding domains
- [ ] **Error messages sanitized** - Never leak database/system errors
- [ ] **API key management** - Secure key generation and rotation
- [ ] **Request size limits** - Prevent DoS via large payloads
- [ ] **Audit logging** - Log all wedding-critical operations

## 🧭 API ROUTE STRUCTURE REQUIREMENTS (MANDATORY)

**❌ FORBIDDEN: Inconsistent API route naming or structure**
**✅ MANDATORY: Standardized RESTful API architecture with wedding context**

### API ROUTE STRUCTURE CHECKLIST
```typescript
/api/v1/suppliers/
├── /auth/                 # Supplier authentication
├── /profile/              # Supplier profile management
├── /weddings/             # Assigned wedding management
├── /services/             # Service offerings
└── /communications/       # Client communications

/api/v1/couples/
├── /auth/                 # Couple authentication
├── /wedding/              # Wedding details management
├── /vendors/              # Vendor connections
├── /planning/             # Wedding planning tools
└── /sharing/              # Wedding information sharing

/api/v1/admin/
├── /analytics/            # Platform analytics
├── /users/                # User management
├── /system/               # System monitoring
└── /billing/              # Subscription management
```

## 🎯 TEAM B SPECIALIZATION: BACKEND/API FOCUS

**BACKEND/API FOCUS:**
- Next.js 15 App Router API routes with TypeScript
- Comprehensive middleware stack (auth, validation, rate limiting)
- Supabase integration with Row Level Security policies
- Wedding-industry optimized database operations
- Real-time API capabilities for vendor coordination
- Performance monitoring and optimization
- Multi-tenant security architecture
- Error handling and logging systems

### API IMPLEMENTATION REQUIREMENTS:
- [ ] RESTful endpoint implementation with wedding context
- [ ] Type-safe request/response handling with Zod schemas
- [ ] Middleware stack: authentication, validation, rate limiting, logging
- [ ] Database operations with proper RLS policy enforcement
- [ ] Real-time capabilities for wedding coordination features
- [ ] Performance optimization for <200ms response times
- [ ] Comprehensive error handling with sanitized responses

## 📋 TECHNICAL SPECIFICATION

**Feature Focus: API Architecture Main Overview - Backend Implementation**

This feature implements the complete API architecture backbone for WedSync, providing secure, scalable, and wedding-optimized endpoints.

### Core API Components:

1. **Middleware Stack Implementation**
   - Authentication middleware with supplier/couple context
   - Request validation middleware with Zod schemas
   - Rate limiting with wedding industry considerations
   - Error handling and sanitization middleware
   - Audit logging for wedding-critical operations

2. **Supplier Platform APIs**
   - Authentication and profile management
   - Wedding assignment and coordination
   - Service offering management
   - Client communication endpoints
   - Performance analytics for suppliers

3. **Couple Platform APIs**
   - Wedding profile creation and management
   - Vendor invitation and coordination
   - Wedding information sharing
   - Planning tool integrations
   - Real-time updates for wedding progress

4. **Admin Platform APIs**
   - User management and analytics
   - System monitoring and health checks
   - Billing and subscription management
   - Platform configuration endpoints

### Wedding Industry Optimizations:
- **Saturday Performance**: Ultra-fast APIs for wedding day operations
- **Seasonal Scaling**: Higher rate limits during wedding season
- **Vendor Coordination**: Real-time APIs for multi-vendor collaboration
- **Data Validation**: Wedding-specific validation rules and constraints

### Integration Requirements:
- Coordinate with Team A (Frontend) for API documentation interface consistency
- Coordinate with Team C (Integration) for third-party service connections
- Coordinate with Team D (Performance) for API optimization strategies
- Coordinate with Team E (QA) for comprehensive API testing coverage

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1

### Core Middleware Implementation:
- [ ] `auth.ts` - Authentication middleware for suppliers/couples/admin
- [ ] `validation.ts` - Zod-based request validation middleware
- [ ] `rateLimit.ts` - Wedding-optimized rate limiting middleware
- [ ] `errorHandler.ts` - Comprehensive error handling and sanitization
- [ ] `audit.ts` - Wedding-critical operation logging middleware

### Supplier API Routes:
- [ ] `/api/v1/suppliers/auth/` - Supplier authentication endpoints
- [ ] `/api/v1/suppliers/profile/` - Profile management endpoints
- [ ] `/api/v1/suppliers/weddings/` - Wedding coordination endpoints
- [ ] `/api/v1/suppliers/services/` - Service management endpoints

### Couple API Routes:
- [ ] `/api/v1/couples/auth/` - Couple authentication endpoints
- [ ] `/api/v1/couples/wedding/` - Wedding management endpoints
- [ ] `/api/v1/couples/vendors/` - Vendor coordination endpoints
- [ ] `/api/v1/couples/planning/` - Planning tool endpoints

### Database Integration:
- [ ] Supabase RLS policies for multi-tenant security
- [ ] Type-safe database operations with proper error handling
- [ ] Real-time subscription setup for wedding coordination
- [ ] Performance-optimized queries for wedding data

## 💾 WHERE TO SAVE YOUR WORK

- **API Routes**: `$WS_ROOT/wedsync/src/app/api/v1/`
- **Middleware**: `$WS_ROOT/wedsync/src/middleware/api/`
- **API Types**: `$WS_ROOT/wedsync/src/types/api/`
- **Validation Schemas**: `$WS_ROOT/wedsync/src/schemas/api/`
- **Tests**: `$WS_ROOT/wedsync/tests/api/`
- **Evidence Package**: `$WS_ROOT/WORKFLOW-V2-DRAFT/INBOX/senior-dev/WS-294-api-backend-evidence.md`

## 🏁 COMPLETION CHECKLIST

- [ ] All API route files created and verified to exist
- [ ] TypeScript compilation successful with proper API types
- [ ] All middleware tests passing with comprehensive coverage
- [ ] Security requirements implemented (auth, validation, rate limiting)
- [ ] Database integration complete with RLS policies
- [ ] Performance targets met (<200ms API responses)
- [ ] Error handling comprehensive and properly sanitized
- [ ] Wedding industry optimizations implemented
- [ ] Real-time capabilities working for coordination features
- [ ] Evidence package prepared with API testing results
- [ ] Cross-team coordination completed for integration consistency

---

**EXECUTE IMMEDIATELY - Focus on secure, scalable API architecture with wedding industry optimization!**