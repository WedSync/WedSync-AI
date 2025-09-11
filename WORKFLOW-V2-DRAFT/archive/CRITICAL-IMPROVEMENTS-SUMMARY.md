# 🚨 CRITICAL WORKFLOW IMPROVEMENTS - CONTEXT7 & SERENA FIRST

## THE PROBLEM WE SOLVED

**Before:** Agents started coding immediately with outdated documentation
- Used deprecated Next.js 14 patterns (we're on Next.js 15!)
- Guessed at Supabase APIs instead of using current docs
- Reinvented patterns that already existed in the codebase
- Wasted 50% of time on outdated approaches

**After:** Context7 + Serena load FIRST, then agents work with current knowledge
- Latest Next.js 15 App Router patterns loaded
- Current Supabase SSR/Auth documentation available
- Existing codebase patterns identified
- Zero wasted effort on deprecated approaches

---

## NEW WORKFLOW ORDER (CRITICAL!)

### ✅ CORRECT ORDER (What we have now):
1. **STEP 1: Load Context7 Documentation** (5-10 min)
   - Get latest library docs for specific feature
   - Load exact APIs and patterns needed
   - No guessing, no deprecated code

2. **STEP 2: Initialize Serena MCP** (2-3 min)
   - Activate project
   - Find existing patterns to follow
   - Understand codebase conventions

3. **STEP 3: Launch Parallel Agents** (AFTER docs loaded!)
   - Agents work with current knowledge
   - Follow existing patterns
   - Use Context7 examples as templates

4. **STEP 4: Development** (With full context)
   - Explore → Plan → Code → Commit
   - Quality over speed
   - Complete implementation

### ❌ OLD BROKEN ORDER (What caused problems):
1. Launch agents immediately
2. Agents start coding with outdated knowledge
3. Try to load docs later (too late!)
4. Discover we used wrong patterns
5. Massive refactoring required

---

## CONTEXT7 LOADING BY FEATURE TYPE

### Form/UI Features:
```typescript
await mcp__context7__get-library-docs("/vercel/next.js", "forms server-actions", 5000);
await mcp__context7__get-library-docs("/react-hook-form/react-hook-form", "validation schemas", 3000);
```

### Database/Backend Features:
```typescript
await mcp__context7__get-library-docs("/supabase/supabase", "database functions rls", 5000);
await mcp__context7__get-library-docs("/supabase/supabase", "edge-functions typescript", 3000);
```

### Authentication/Security Features:
```typescript
await mcp__context7__get-library-docs("/supabase/supabase", "auth-ssr jwt-verification", 5000);
await mcp__context7__get-library-docs("/vercel/next.js", "middleware authentication", 3000);
```

### Payment Features:
```typescript
await mcp__context7__get-library-docs("/stripe/stripe-js", "payment-intents subscriptions", 5000);
await mcp__context7__get-library-docs("/stripe/stripe-node", "webhooks billing", 3000);
```

---

## TIME CONSTRAINT REMOVAL

### ❌ REMOVED (Caused incomplete work):
- "First 30 minutes"
- "3 hours per sprint"
- "Complete by 12 PM"
- "Estimated review time: 10 minutes"

### ✅ REPLACED WITH:
- "Continue until you FULLY understand"
- "Focus on completeness, not speed"
- "Don't rush - proper planning prevents problems"
- "Take the time needed"
- "Only mark complete when ACTUALLY complete"

---

## CRITICAL RULES FOR DEV MANAGER

When creating the 15 team prompts, ALWAYS:

1. **Start each prompt with Context7 + Serena loading**
   - Specific to that feature
   - Before any agent work
   - Use feature-type examples above

2. **Make Context7 queries specific**
   - Not: `get-library-docs("/vercel/next.js", "general", 1000)`
   - Yes: `get-library-docs("/vercel/next.js", "server-actions form-validation", 5000)`

3. **Include Serena pattern discovery**
   - Find similar components
   - Review existing implementations
   - Follow established patterns

4. **Remove ALL time pressure**
   - No deadlines in prompts
   - Quality over speed messaging
   - "Complete" means actually complete

---

## WHY THIS MATTERS

### Cost of Wrong Approach:
- 3 hours building with Next.js 14 patterns
- 2 hours discovering it's wrong
- 3 hours refactoring to Next.js 15
- **Total: 8 hours for 3 hours of work**

### Cost of Right Approach:
- 10 min loading correct docs
- 3 hours building correctly first time
- 0 hours refactoring
- **Total: 3.2 hours for 3 hours of work**

**SAVINGS: 60% time reduction + higher quality**

---

## ENFORCEMENT

Every prompt MUST have this structure:
1. Context7 documentation loading (specific to feature)
2. Serena codebase initialization
3. Then and only then - parallel agents
4. No time constraints anywhere
5. Quality gates over speed targets

**This is non-negotiable for workflow success.**