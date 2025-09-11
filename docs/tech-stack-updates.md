# Tech Stack Documentation Updates Required

## Priority 1: Framework Documentation

### Next.js 15.4.3
- **New Features to Document:**
  - Turbopack stable features and configuration
  - Partial Prerendering (PPR) patterns
  - Enhanced caching strategies with `unstable_cache`
  - Server Actions improvements
  - Improved error handling with error.tsx
  
### React 19.1.1
- **Breaking Changes & New Patterns:**
  - New `use` hook for promises and context
  - Actions for form handling
  - Document metadata improvements
  - Compiler optimizations (opt-in)
  - Ref as prop (no forwardRef needed)

### Tailwind CSS 4.1.11
- **Major Version Changes:**
  - New Oxide engine performance
  - CSS-first configuration approach
  - Lightning CSS integration
  - Container queries support
  - New @theme directive

## Priority 2: Core Dependencies

### Supabase Updates
- Current: `@supabase/supabase-js@2.54.0` (Latest as of my knowledge)
- Document: 
  - New auth helpers for App Router
  - Realtime 2.0 features
  - Vector search with pgvector
  - Edge Functions best practices

### Form Management
- `react-hook-form@7.62.0` - Latest v7 features
- `zod@4.0.16` - Zod v4 is a major update
- Document new validation patterns and performance improvements

### Testing Stack
- `@playwright/test@1.54.2` - Latest Playwright features
- `@testing-library/react@16.3.0` - React 19 compatibility
- `jest@30.0.5` - Jest 30 is very new

## Priority 3: Missing/Outdated in Your Docs

### State Management Discrepancy
Your docs mention Zustand and TanStack Query, but they're not in package.json. Consider:
- Adding these if needed, or
- Updating docs to reflect actual state management approach

### Missing AI/LLM Integration
No OpenAI package despite AI features mentioned in .env.example

### Missing Email Service
Resend mentioned but not installed

### Missing Payment Processing
Stripe mentioned but not installed

## Recommended Documentation Sources

1. **Official Docs to Bookmark:**
   - https://nextjs.org/docs/app (App Router specific)
   - https://react.dev/reference/react (React 19 reference)
   - https://tailwindcss.com/docs/v4 (When available)
   - https://supabase.com/docs/guides/auth/server-side/nextjs

2. **Migration Guides:**
   - Next.js 14 to 15 migration
   - React 18 to 19 changes
   - Tailwind v3 to v4 upgrade

3. **Performance Documentation:**
   - React Server Components optimization
   - Suspense boundaries best practices
   - Next.js caching strategies

## Action Items

1. **Update tech-stack.md** - Version numbers don't match package.json
2. **Add missing packages** or remove from documentation:
   - Zustand, TanStack Query, OpenAI, Resend, Stripe
3. **Create migration guide** for team members on new React 19 patterns
4. **Document Motion vs Framer Motion** usage
5. **Setup compatibility matrix** for all dependencies

## TypeScript Configuration Note
Your TypeScript target is ES2017 which is quite conservative for a modern Next.js app. Consider updating to ES2020 or ES2022 for better modern JavaScript features.