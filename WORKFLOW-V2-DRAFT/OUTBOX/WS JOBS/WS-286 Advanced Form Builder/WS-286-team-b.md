# TEAM B - ROUND 1: WS-286 - Advanced Form Builder
## 2025-01-20 - Development Round 1

**YOUR MISSION:** Build secure form builder API with dynamic validation, conditional logic engine, and wedding data integration
**FEATURE ID:** WS-286 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round
**THINK ULTRA HARD** about form security, validation complexity, and wedding-specific business logic

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/app/api/form-builder/
cat $WS_ROOT/wedsync/src/app/api/form-builder/forms/route.ts | head -20
```

## 🧠 SEQUENTIAL THINKING FOR COMPLEX FEATURE PLANNING

### Form Builder API Architecture
```typescript
mcp__sequential-thinking__sequential_thinking({
  thought: "Form builder API requirements: POST /api/form-builder/forms (create forms), PUT /api/form-builder/forms/[id] (update), GET /api/form-builder/templates (wedding templates), POST /api/form-builder/validate (dynamic validation), GET /api/form-builder/schema (field types), POST /api/form-builder/conditional-logic (logic rules). Each needs comprehensive security.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Wedding form validation complexity: Guest forms need relationship validation (guest +1 rules), dietary restrictions require enum validation, song requests need content filtering, vendor forms need business verification, timeline forms need date logic, RSVP forms need deadline validation.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Conditional logic engine: Forms show/hide fields based on wedding type, venue selection affects catering options, guest count influences seating fields, budget range shows appropriate vendor tiers, season affects timeline recommendations. Complex rule evaluation needed.",
  nextThoughtNeeded: true,
  thoughtNumber: 3,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Security and performance: Form schemas need validation to prevent XSS, file uploads require virus scanning, form submissions need rate limiting, conditional logic must prevent infinite loops, wedding data integration requires proper authorization, analytics need privacy compliance.",
  nextThoughtNeeded: false,
  thoughtNumber: 4,
  totalThoughts: 4
});
```

## 🎯 DELIVERABLES
- [ ] Form builder CRUD API with comprehensive validation
- [ ] Conditional logic engine with wedding-specific rules
- [ ] Wedding template system with pre-built forms
- [ ] Dynamic validation system for complex wedding data
- [ ] Integration APIs for wedding data (guests, vendors)
- [ ] Form analytics API for completion tracking

**✅ Ready for secure wedding form management and processing**