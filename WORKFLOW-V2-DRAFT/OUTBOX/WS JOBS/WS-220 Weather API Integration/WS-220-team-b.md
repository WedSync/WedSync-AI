# TEAM B - ROUND 1: WS-220 - Weather API Integration
## 2025-01-30 - Development Round 1

**YOUR MISSION:** Build secure API endpoints and data transformation logic for weather data integration with wedding planning system
**FEATURE ID:** WS-220 (Track all work with this ID)

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/app/api/weather/
cat $WS_ROOT/wedsync/src/app/api/weather/route.ts | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test weather-api
# MUST show: "All tests passing"
```

## 📚 ENHANCED SERENA + REF SETUP (Backend Focus)

### A. SERENA API PATTERN DISCOVERY
```typescript
await mcp__serena__search_for_pattern("route.ts POST GET handler");
await mcp__serena__find_symbol("withSecureValidation middleware", "", true);
await mcp__serena__read_file("$WS_ROOT/wedsync/src/lib/validation/middleware.ts");
```

### B. BACKEND DOCUMENTATION
```typescript
# Use Ref MCP to search for:
# - "Next.js route-handlers weather-api"
# - "Zod schema-validation weather-data"
# - "Environment variables API-keys security"
```

## 🔒 MANDATORY SECURITY IMPLEMENTATION

### Weather API Security Pattern:
```typescript
import { withSecureValidation } from '$WS_ROOT/wedsync/src/lib/validation/middleware';
import { z } from 'zod';

const weatherRequestSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  days: z.number().min(1).max(15).default(15)
});

export const GET = withSecureValidation(
  weatherRequestSchema,
  async (request, validatedData) => {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Rate limiting for weather API calls
    const rateLimitResult = await rateLimitService.checkRateLimit(request);
    if (!rateLimitResult.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }
    
    // Secure weather data fetching logic here
  }
);
```

## CORE DELIVERABLES
- [ ] Weather API route handlers with proper security validation
- [ ] Data transformation logic for weather service integration
- [ ] Caching mechanism for weather data optimization
- [ ] Error handling for weather service unavailability
- [ ] Rate limiting for weather API calls

**EXECUTE IMMEDIATELY - Build secure weather API backend with comprehensive validation!**