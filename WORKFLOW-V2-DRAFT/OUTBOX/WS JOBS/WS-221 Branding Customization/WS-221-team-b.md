# TEAM B - ROUND 1: WS-221 - Branding Customization
## 2025-01-30 - Development Round 1

**YOUR MISSION:** Build secure API endpoints and data management for branding customization system
**FEATURE ID:** WS-221 (Track all work with this ID)

## =¨ CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**  MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/app/api/branding/
cat $WS_ROOT/wedsync/src/app/api/branding/route.ts | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test branding-api
# MUST show: "All tests passing"
```

## =Ú ENHANCED SERENA + REF SETUP (Backend Focus)

### A. SERENA API PATTERN DISCOVERY
```typescript
await mcp__serena__search_for_pattern("route.ts file-upload handler");
await mcp__serena__find_symbol("withSecureValidation middleware", "", true);
await mcp__serena__read_file("$WS_ROOT/wedsync/src/lib/validation/middleware.ts");
```

### B. BACKEND DOCUMENTATION
```typescript
# Use Ref MCP to search for:
# - "Next.js file-upload api-routes"
# - "Zod schema-validation file-types"
# - "Image processing security validation"
```

## = MANDATORY SECURITY IMPLEMENTATION

### Branding API Security Pattern:
```typescript
import { withSecureValidation } from '$WS_ROOT/wedsync/src/lib/validation/middleware';
import { z } from 'zod';

const brandingSchema = z.object({
  primaryColor: z.string().regex(/^#[0-9A-F]{6}$/i),
  secondaryColor: z.string().regex(/^#[0-9A-F]{6}$/i),
  logoFile: z.object({
    type: z.enum(['image/jpeg', 'image/png']),
    size: z.number().max(2097152) // 2MB limit
  }).optional(),
  fontFamily: z.enum(['Inter', 'Poppins', 'Playfair Display'])
});

export const POST = withSecureValidation(
  brandingSchema,
  async (request, validatedData) => {
    // Authentication and file upload security logic
  }
);
```

## CORE DELIVERABLES
- [ ] Branding API route handlers with file upload security
- [ ] Logo file validation and image processing
- [ ] Brand theme storage and retrieval system
- [ ] Color validation and accessibility checking
- [ ] Secure file storage for brand assets

**EXECUTE IMMEDIATELY - Build secure branding API with comprehensive file upload validation!**