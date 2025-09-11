# TEAM B - ROUND 1: [WS] - [FEATURE] - Backend/API & Database

**Date:** 2025-08-29  
**Feature ID:** [WS] (Track all work with this ID)
**Mission:** Create secure API endpoints and database schema  
**Context:** You are Team B working in parallel with 4 other teams.

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/app/api/[feature]/
cat $WS_ROOT/wedsync/src/app/api/[feature]/route.ts | head -20
```

2. **TYPECHECK + TEST RESULTS:**
```bash
npm run typecheck && npm test src/app/api/[feature]
```

## 🎯 USER STORY & WEDDING CONTEXT
**As a:** Wedding supplier  
**I want to:** Secure API endpoints for [feature] data management  
**So that:** Data is protected and performance is optimized

## 🔒 MANDATORY SECURITY IMPLEMENTATION
```typescript
import { withSecureValidation } from '$WS_ROOT/wedsync/src/lib/validation/middleware';
import { z } from 'zod';
import { secureStringSchema } from '$WS_ROOT/wedsync/src/lib/validation/schemas';

export const GET = withSecureValidation(schema, async (request, validatedData) => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // Implementation with validated data
});
```

## 💾 WHERE TO SAVE
- API Routes: `$WS_ROOT/wedsync/src/app/api/[feature]/`
- Types: `$WS_ROOT/wedsync/src/types/[feature].ts`
- Migrations: `$WS_ROOT/wedsync/supabase/migrations/`

**Output to:** `$WS_ROOT/WORKFLOW-V2-DRAFT/INBOX/senior-dev/[WS]-[feature]-team-b-round-1-complete.md`

END OF ROUND PROMPT - EXECUTE IMMEDIATELY
