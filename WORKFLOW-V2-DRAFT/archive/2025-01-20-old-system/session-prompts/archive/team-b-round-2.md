# TEAM B - ROUND 2: Rate Limiting Implementation - API Security and Protection

**Date:** 2025-01-21  
**Priority:** P0 from roadmap  
**Mission:** Implement comprehensive rate limiting system for API protection and security  
**Context:** You are Team B working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
Complete rate limiting implementation (0% complete):
- Multi-tier rate limiting (IP, user, organization)
- Redis-based rate limit storage
- Sliding window counters
- Rate limit headers and client feedback
- Admin controls for rate limit management
- Integration with existing auth middleware

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Backend: Supabase (PostgreSQL 15), Edge Functions
- Testing: Playwright MCP, Vitest
- Rate Limiting: Redis with sliding window algorithm
- Middleware: Next.js middleware integration

---

## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

```typescript
// 1. CONTEXT7 MCP - Load latest docs for Rate Limiting:
await mcp__context7__get-library-docs("/vercel/next.js", "middleware api-routes", 5000);
await mcp__context7__get-library-docs("/supabase/supabase", "edge-functions redis", 3000);
await mcp__context7__get-library-docs("/ioredis/ioredis", "rate-limiting sliding-window", 3000);

// 2. SERENA MCP - Initialize and review existing auth:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__find_symbol("middleware", "src", true);
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS

1. **task-tracker-coordinator** --think-hard "Rate limiting implementation"
2. **api-architect** --think-hard "Rate limiting middleware design"
3. **security-compliance-officer** --think-ultra-hard "API protection strategies"
4. **performance-optimization-expert** --redis-optimization
5. **test-automation-architect** --rate-limiting-testing

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 2 (Core Implementation):
- [ ] Rate limiting middleware with Redis backend
- [ ] Multi-tier limits (IP: 1000/hr, User: 500/hr, Org: 2000/hr)
- [ ] Sliding window counter implementation
- [ ] Rate limit headers (X-RateLimit-*)
- [ ] Admin API for rate limit management
- [ ] Integration with auth middleware
- [ ] Unit tests with >80% coverage

---

## 📝 SUCCESS CRITERIA & REPORTS STRUCTURE
[Same format as previous prompts - abbreviated for space]

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY