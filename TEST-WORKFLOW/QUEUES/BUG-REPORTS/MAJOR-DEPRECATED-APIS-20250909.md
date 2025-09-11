# 🟠 MAJOR BUG REPORT: Deprecated API Usage

**Severity**: MAJOR  
**Source**: SonarQube Analysis (2025-09-09)
**Total Issues**: 836 deprecated API calls
**Rule**: typescript:S1874
**Wedding Impact**: MEDIUM - APIs may be removed in future updates

## 🔍 Issue Description

The codebase contains 836 instances of deprecated API usage that need migration to modern alternatives. These deprecated APIs may be removed in future library updates, potentially breaking wedding platform functionality.

## 📊 Deprecated API Categories

### 1. Next.js Legacy APIs (312 instances)
- `getInitialProps` → `getServerSideProps` or `getStaticProps`
- `<Image>` legacy props → Next.js 13+ Image component
- Router events → Navigation hooks
- Legacy API routes → App Router

### 2. React Deprecated Patterns (198 instances)
- `componentWillMount` → `useEffect`
- `componentWillReceiveProps` → `getDerivedStateFromProps`
- Legacy context API → React Context with hooks
- `findDOMNode` → Ref usage

### 3. Supabase Client v1 → v2 (147 instances)
- `.auth.signIn()` → `.auth.signInWithPassword()`
- `.auth.session()` → `.auth.getSession()`
- `.auth.user()` → `.auth.getUser()`
- Storage API changes

### 4. Date/Time Libraries (92 instances)
- Moment.js → date-fns or native Intl
- Legacy timezone handling
- Deprecated formatting methods

### 5. Payment Processing (87 instances)
- Stripe Elements v1 → Payment Element
- Legacy checkout → Stripe Checkout Session
- Card element → Payment Element

## 🎯 Migration Priority

### Critical Migrations (Immediate)
```typescript
// ❌ OLD - Will break in Next.js 15
export async function getInitialProps(context) {
  return { props: { data } }
}

// ✅ NEW
export async function getServerSideProps(context) {
  return { props: { data } }
}
```

### High Priority (This Sprint)
```typescript
// ❌ OLD - Supabase v1
const { user, error } = await supabase.auth.signIn({
  email, password
})

// ✅ NEW - Supabase v2
const { data, error } = await supabase.auth.signInWithPassword({
  email, password
})
```

### Medium Priority (Next Sprint)
```typescript
// ❌ OLD - Moment.js
moment(weddingDate).format('YYYY-MM-DD')

// ✅ NEW - date-fns
format(weddingDate, 'yyyy-MM-dd')
```

## 💰 Wedding Impact Analysis

### Risk Assessment:
- **Payment Processing**: HIGH - Could break vendor payments
- **Authentication**: HIGH - Login/signup failures
- **Date Calculations**: MEDIUM - Timeline miscalculations
- **Image Loading**: LOW - Performance degradation only

### Affected Features:
1. **Vendor Payments**: 87 payment API calls need update
2. **User Authentication**: 147 auth flows affected
3. **Wedding Timelines**: 92 date calculations
4. **Photo Galleries**: 74 image components

## 🔧 Migration Strategy

### Automated Migration Script
```bash
#!/bin/bash
# Phase 1: Automated replacements

# Next.js migrations
npx @next/codemod@latest next-image-to-legacy-image
npx @next/codemod@latest new-link

# React migrations  
npx react-codemod React-PropTypes-to-prop-types
npx react-codemod findDOMNode

# Supabase migration
npm install @supabase/supabase-js@latest
npx supabase-migration-tool v1-to-v2
```

### Manual Migration Steps

1. **Create migration branch**
   ```bash
   git checkout -b fix/deprecated-apis-migration
   ```

2. **Run automated tools**
   ```bash
   ./run-api-migrations.sh
   ```

3. **Manual review required for:**
   - Complex authentication flows
   - Custom payment integrations
   - Date calculations with timezone logic
   - Dynamic imports

## 📋 Testing Requirements

### Unit Tests
- [ ] All migrated APIs have passing tests
- [ ] No regression in existing tests
- [ ] New tests for migrated patterns

### Integration Tests
- [ ] Full user authentication flow
- [ ] Complete payment processing
- [ ] Wedding timeline calculations
- [ ] Image loading and optimization

### Wedding Scenario Tests
- [ ] Saturday wedding peak load
- [ ] Multi-vendor coordination
- [ ] Guest communication flows
- [ ] Payment processing under load

## 🎯 Success Metrics

- **Zero deprecated API warnings** in build
- **No functionality regression**
- **Performance improvement** (expected 10-15%)
- **Bundle size reduction** (removing Moment.js saves ~70KB)

## 📅 Migration Timeline

### Week 1: Critical APIs
- Payment processing (Stripe)
- Authentication (Supabase)
- Testing and validation

### Week 2: High Priority
- Next.js App Router migration
- React hooks conversion
- Image component updates

### Week 3: Medium Priority
- Date library migration
- Remaining deprecations
- Performance testing

### Week 4: Validation
- Full regression testing
- Wedding scenario validation
- Production deployment prep

## 🛠️ Tooling & Resources

### Migration Tools
- [Next.js Codemods](https://nextjs.org/docs/advanced-features/codemods)
- [Supabase Migration Guide](https://supabase.com/docs/guides/migrations)
- [React 18 Migration](https://react.dev/blog/2022/03/08/react-18-upgrade-guide)

### Documentation
- [API Migration Checklist](./migration-checklist.md)
- [Testing Strategy](./testing-strategy.md)
- [Rollback Plan](./rollback-plan.md)

## ⚠️ Breaking Changes

### Required Package Updates
```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.38.0",
    "next": "^14.2.0",
    "react": "^18.2.0",
    "date-fns": "^2.30.0",
    "@stripe/stripe-js": "^2.0.0"
  }
}
```

### Environment Variables
```env
# Old
NEXT_PUBLIC_SUPABASE_KEY=...

# New
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

---

**Priority**: P1 - High Priority
**Assigned Team**: Full Stack Team
**Due Date**: End of next sprint
**Review Required**: Tech lead approval