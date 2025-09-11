# 📝 TEAM PROMPT TEMPLATES - 5 TEAMS × 3 SPRINTS
## Reusable Templates for Daily Development

---

## 🎯 UNIVERSAL PROMPT STRUCTURE

Every prompt follows this exact structure:

```markdown
# TEAM [A-E] - SPRINT [1-3]: [Feature Name]
## [DATE] - [Sprint Time]

**YOUR MISSION:** [Specific deliverable]
**TIME LIMIT:** 3 hours
**THINK ULTRA HARD** about [specific challenge]

## 🚀 IMMEDIATE PARALLEL AGENTS
[List 6 agents to launch]

## 📚 CONTEXT7 DOCUMENTATION
[MCP queries for docs]

## 📋 TECHNICAL SPECIFICATION
[Path to tech spec]

## 🎯 SPECIFIC DELIVERABLES
[Checklist of deliverables]

## 🔗 DEPENDENCIES
[What you need/provide]

## 🔒 SECURITY REQUIREMENTS
[Security checklist]

## 🎭 PLAYWRIGHT TESTING
[Test requirements]

## 📊 SUCCESS CRITERIA
[Measurable criteria]

## 💾 WHERE TO SAVE
[File paths]

## ⚠️ CRITICAL WARNINGS
[Things not to do]

## 🏁 COMPLETION CHECKLIST
[Final checklist]
```

---

## 📦 TEAM A - FRONTEND/UI TEMPLATES

### Sprint 1: Implementation
```markdown
# TEAM A - SPRINT 1: [Component Name]
## [DATE] - Morning (9:00 AM - 12:00 PM)

**YOUR MISSION:** Build the [Component] with full TypeScript types and accessibility
**TIME LIMIT:** 3 hours
**THINK ULTRA HARD** about component reusability and performance

## 🚀 IMMEDIATE PARALLEL AGENTS
1. task-tracker-coordinator --think-hard --break-down "Build [Component]"
2. react-ui-specialist --think-hard --use-context7
3. ui-ux-designer --accessibility-focus
4. typescript-fixes --ensure-types
5. test-automation-architect --component-tests
6. code-quality-guardian --react-patterns

## 📚 CONTEXT7 DOCUMENTATION
```typescript
await mcp__context7__get-library-docs("/vercel/next.js", "app router components", 3000);
await mcp__context7__get-library-docs("/tailwindcss/tailwindcss", "responsive design", 2000);
await mcp__context7__get-library-docs("/radix-ui/primitives", "accessible components", 2000);
```

## 🎯 DELIVERABLES
- [ ] Component with TypeScript interface
- [ ] Responsive design (mobile/tablet/desktop)
- [ ] Accessibility (ARIA labels, keyboard nav)
- [ ] Loading/error states
- [ ] Unit tests with React Testing Library
- [ ] Storybook story (if applicable)

## 💾 FILES TO CREATE/MODIFY
- `/wedsync/src/components/[feature]/[Component].tsx`
- `/wedsync/src/components/[feature]/[Component].test.tsx`
- `/wedsync/src/types/[feature].ts`
```

### Sprint 2: Enhancement
```markdown
# TEAM A - SPRINT 2: Polish [Component]
## [DATE] - Afternoon (1:00 PM - 4:00 PM)

**YOUR MISSION:** Polish and optimize [Component] for production
**TIME LIMIT:** 3 hours
**THINK ULTRA HARD** about edge cases and performance

## 🚀 IMMEDIATE PARALLEL AGENTS
1. performance-optimization-expert --react-focus
2. accessibility-validator --wcag-aa
3. ui-ux-designer --polish-interactions
4. test-automation-architect --edge-cases
5. code-quality-guardian --best-practices
6. security-compliance-officer --xss-prevention

## 🎯 DELIVERABLES
- [ ] Performance optimization (React.memo, useMemo)
- [ ] Animation/transitions
- [ ] Dark mode support
- [ ] Form validation (if applicable)
- [ ] Error boundary
- [ ] Performance tests
```

### Sprint 3: Integration
```markdown
# TEAM A - SPRINT 3: Integrate [Component]
## [DATE] - Evening (5:00 PM - 8:00 PM)

**YOUR MISSION:** Connect [Component] to backend and ensure full integration
**TIME LIMIT:** 3 hours
**THINK ULTRA HARD** about data flow and state management

## 🎯 DELIVERABLES
- [ ] Connect to API endpoints
- [ ] Global state integration
- [ ] Real-time updates (if applicable)
- [ ] E2E tests with Playwright
- [ ] Documentation update
- [ ] Performance validation
```

---

## 🔧 TEAM B - BACKEND/API TEMPLATES

### Sprint 1: Implementation
```markdown
# TEAM B - SPRINT 1: [API/Feature Name]
## [DATE] - Morning (9:00 AM - 12:00 PM)

**YOUR MISSION:** Build [API endpoint/service] with complete validation and types
**TIME LIMIT:** 3 hours
**THINK ULTRA HARD** about data integrity and security

## 🚀 IMMEDIATE PARALLEL AGENTS
1. task-tracker-coordinator --think-hard --break-down "Build [API]"
2. postgresql-database-expert --schema-design
3. api-architect --rest-patterns
4. security-compliance-officer --auth-validation
5. test-automation-architect --api-tests
6. code-quality-guardian --backend-patterns

## 📚 CONTEXT7 DOCUMENTATION
```typescript
await mcp__context7__get-library-docs("/vercel/next.js", "api routes", 3000);
await mcp__context7__get-library-docs("/supabase/supabase", "database queries", 2000);
await mcp__context7__get-library-docs("/zod/zod", "schema validation", 1500);
```

## 🎯 DELIVERABLES
- [ ] Database schema/migration
- [ ] API endpoint with validation
- [ ] Zod schemas for request/response
- [ ] Authentication middleware
- [ ] Error handling
- [ ] Unit tests

## 💾 FILES TO CREATE/MODIFY
- `/wedsync/src/app/api/[feature]/route.ts`
- `/wedsync/src/lib/validations/[feature].ts`
- `/wedsync/supabase/migrations/[number]_[feature].sql`
```

### Sprint 2: Enhancement
```markdown
# TEAM B - SPRINT 2: Optimize [API]
## [DATE] - Afternoon (1:00 PM - 4:00 PM)

**YOUR MISSION:** Optimize [API] for performance and reliability
**TIME LIMIT:** 3 hours
**THINK ULTRA HARD** about query optimization and caching

## 🎯 DELIVERABLES
- [ ] Query optimization
- [ ] Caching strategy
- [ ] Rate limiting
- [ ] Batch operations
- [ ] Webhook support (if applicable)
- [ ] Load tests
```

### Sprint 3: Integration
```markdown
# TEAM B - SPRINT 3: Full API Integration
## [DATE] - Evening (5:00 PM - 8:00 PM)

**YOUR MISSION:** Ensure [API] works end-to-end with frontend
**TIME LIMIT:** 3 hours
**THINK ULTRA HARD** about API contracts and real-world usage

## 🎯 DELIVERABLES
- [ ] API documentation
- [ ] Frontend integration verified
- [ ] WebSocket/real-time (if applicable)
- [ ] Integration tests
- [ ] Performance benchmarks
- [ ] Security audit
```

---

## 🔌 TEAM C - INTEGRATION/SERVICES TEMPLATES

### Sprint 1: Implementation
```markdown
# TEAM C - SPRINT 1: [Integration Name]
## [DATE] - Morning (9:00 AM - 12:00 PM)

**YOUR MISSION:** Integrate [third-party service/system]
**TIME LIMIT:** 3 hours
**THINK ULTRA HARD** about error handling and resilience

## 🚀 IMMEDIATE PARALLEL AGENTS
1. task-tracker-coordinator --think-hard --break-down "Integrate [service]"
2. integration-specialist --service-focus
3. api-architect --webhook-patterns
4. security-compliance-officer --api-keys
5. test-automation-architect --integration-tests
6. code-quality-guardian --service-patterns

## 📚 CONTEXT7 DOCUMENTATION
```typescript
await mcp__context7__get-library-docs("/stripe/stripe-js", "payment integration", 2000);
await mcp__context7__get-library-docs("/twilio/twilio", "sms integration", 2000);
// Add service-specific docs
```

## 🎯 DELIVERABLES
- [ ] Service client setup
- [ ] Configuration management
- [ ] Authentication/API keys
- [ ] Basic operations
- [ ] Error handling
- [ ] Unit tests with mocks

## 💾 FILES TO CREATE/MODIFY
- `/wedsync/src/lib/services/[service].ts`
- `/wedsync/src/lib/integrations/[service]/client.ts`
- `/wedsync/.env.example` (document required keys)
```

---

## 💑 TEAM D - WEDME PLATFORM TEMPLATES

### Sprint 1: Implementation
```markdown
# TEAM D - SPRINT 1: [WedMe Feature]
## [DATE] - Morning (9:00 AM - 12:00 PM)

**YOUR MISSION:** Build [couple-facing feature] for WedMe platform
**TIME LIMIT:** 3 hours
**THINK ULTRA HARD** about couple user experience and mobile-first design

## 🚀 IMMEDIATE PARALLEL AGENTS
1. task-tracker-coordinator --think-hard --break-down "Build [WedMe feature]"
2. react-ui-specialist --mobile-first
3. wedding-domain-expert --couple-needs
4. ui-ux-designer --consumer-focus
5. test-automation-architect --mobile-tests
6. code-quality-guardian --consumer-patterns

## 🎯 DELIVERABLES
- [ ] Mobile-responsive component
- [ ] Couple authentication flow
- [ ] Guest management features
- [ ] Social sharing capability
- [ ] Unit tests
- [ ] Mobile device tests

## 💾 FILES TO CREATE/MODIFY
- `/wedsync/src/app/wedme/[feature]/page.tsx`
- `/wedsync/src/components/couple/[Component].tsx`
- `/wedsync/src/lib/wedme/[service].ts`
```

---

## 🧪 TEAM E - TESTING/DEVOPS TEMPLATES

### Sprint 1: Test Creation
```markdown
# TEAM E - SPRINT 1: Test [Feature/Component]
## [DATE] - Morning (9:00 AM - 12:00 PM)

**YOUR MISSION:** Create comprehensive test suite for [feature]
**TIME LIMIT:** 3 hours
**THINK ULTRA HARD** about edge cases and real user scenarios

## 🚀 IMMEDIATE PARALLEL AGENTS
1. task-tracker-coordinator --think-hard --break-down "Test [feature]"
2. test-automation-architect --test-strategy
3. playwright-visual-testing-specialist --e2e-focus
4. performance-optimization-expert --load-tests
5. security-compliance-officer --security-tests
6. code-quality-guardian --test-quality

## 🎭 PLAYWRIGHT REQUIREMENTS
```typescript
// Visual regression test
await mcp__playwright__browser_navigate({url: '/feature'});
await mcp__playwright__browser_take_screenshot({
  filename: 'feature-baseline.png',
  fullPage: true
});

// Interaction test
await mcp__playwright__browser_click({
  element: 'Submit button',
  ref: 'button[type="submit"]'
});

// Accessibility test
const snapshot = await mcp__playwright__browser_snapshot();
// Verify ARIA structure
```

## 🎯 DELIVERABLES
- [ ] Unit test coverage >80%
- [ ] E2E user journey tests
- [ ] Performance benchmarks
- [ ] Security test cases
- [ ] Visual regression tests
- [ ] Load/stress tests

## 💾 FILES TO CREATE/MODIFY
- `/wedsync/tests/unit/[feature].test.ts`
- `/wedsync/tests/e2e/[feature].spec.ts`
- `/wedsync/tests/performance/[feature].perf.ts`
- `/wedsync/playwright/[feature].spec.ts`
```

### Sprint 2: Test Enhancement
```markdown
# TEAM E - SPRINT 2: Enhanced Testing
## [DATE] - Afternoon (1:00 PM - 4:00 PM)

**YOUR MISSION:** Add edge cases and performance tests
**TIME LIMIT:** 3 hours
**THINK ULTRA HARD** about failure scenarios

## 🎯 DELIVERABLES
- [ ] Edge case coverage
- [ ] Error scenario tests
- [ ] Cross-browser tests
- [ ] Mobile device tests
- [ ] Accessibility validation
- [ ] Performance profiling
```

### Sprint 3: Full Validation
```markdown
# TEAM E - SPRINT 3: Complete Validation
## [DATE] - Evening (5:00 PM - 8:00 PM)

**YOUR MISSION:** Run full test suite and create report
**TIME LIMIT:** 3 hours
**THINK ULTRA HARD** about production readiness

## 🎯 DELIVERABLES
- [ ] Full regression suite
- [ ] Integration test coverage
- [ ] Performance benchmarks
- [ ] Security scan results
- [ ] Test coverage report
- [ ] Go/No-go recommendation
```

---

## 🔄 DEPENDENCY PATTERNS

### Sequential Dependencies
```markdown
## 🔗 DEPENDENCIES
### What you NEED from other teams:
- FROM Team B: API endpoint `/api/[feature]` - Available by 11:00 AM
- Check: `curl http://localhost:3000/api/[feature]`

### What other teams NEED from you:
- TO Team D: Component export - Must complete by 11:30 AM
- Export: `export { Component } from './Component'`
```

### Parallel Work (No Dependencies)
```markdown
## 🔗 DEPENDENCIES
### What you NEED from other teams:
- None - Work independently

### What other teams NEED from you:
- None - No blockers for other teams
```

### Integration Points
```markdown
## 🔗 DEPENDENCIES
### Integration checkpoint at 3:30 PM:
- Combine Team A frontend + Team B backend
- Test data flow end-to-end
- Verify contracts match
```

---

## 🏆 SUCCESS CRITERIA TEMPLATES

### Frontend Success
```markdown
## 📊 SUCCESS CRITERIA
- [ ] TypeScript: No errors
- [ ] Accessibility: WCAG AA compliant
- [ ] Performance: <100ms render
- [ ] Mobile: Works on all devices
- [ ] Tests: >80% coverage
```

### Backend Success
```markdown
## 📊 SUCCESS CRITERIA
- [ ] API Response: <200ms
- [ ] Validation: All inputs validated
- [ ] Security: Auth required
- [ ] Database: Queries optimized
- [ ] Tests: All passing
```

### Integration Success
```markdown
## 📊 SUCCESS CRITERIA
- [ ] Service: Connected and working
- [ ] Errors: Graceful handling
- [ ] Retry: Logic implemented
- [ ] Monitoring: Logs in place
- [ ] Tests: Integration verified
```

---

## 📝 SPRINT TIMING GUIDE

### Morning Sprint (9:00 AM - 12:00 PM)
- Focus: Core implementation
- Energy: High
- Type: Complex new features

### Afternoon Sprint (1:00 PM - 4:00 PM)
- Focus: Enhancement & optimization
- Energy: Moderate
- Type: Polish & improvements

### Evening Sprint (5:00 PM - 8:00 PM)
- Focus: Integration & testing
- Energy: Steady
- Type: Connecting pieces

---

## 🚨 COMMON PROMPT MISTAKES TO AVOID

❌ **Too Vague:**
"Work on the frontend"

✅ **Specific:**
"Build the ClientProfileForm component with validation"

❌ **Missing Dependencies:**
"Create the dashboard"

✅ **Clear Dependencies:**
"Create dashboard after Team B completes /api/metrics endpoint"

❌ **No Success Criteria:**
"Add some tests"

✅ **Measurable:**
"Achieve 80% test coverage with E2E user journey"

---

**Use these templates to generate consistent, high-quality prompts for all teams.**