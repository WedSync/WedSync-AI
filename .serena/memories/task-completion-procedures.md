# Task Completion Procedures

## After EVERY feature/task completion:

### 1. Verification Cycles (MANDATORY)
- **Functionality** - Works exactly as specified
- **Data Integrity** - Zero data loss possible
- **Security** - GDPR compliant, no vulnerabilities
- **Mobile** - Perfect on iPhone SE (smallest screen)
- **Business Logic** - Tier limits enforced correctly

### 2. Testing Requirements
```bash
# Run all tests
npm test
npm run test:coverage  # Minimum 90% coverage

# Type checking
npm run typecheck

# Linting
npm run lint

# Build verification
npm run build
```

### 3. Code Quality
- Use verification-cycle-coordinator subagent
- Use test-automation-architect subagent
- Use security-compliance-officer before deployment
- Document everything with documentation-chronicler

### 4. Documentation (MANDATORY)
- **NO FEATURE** is complete without documentation
- Use `documentation-chronicler` subagent after every session
- Document all features built with business reasoning
- Record all technical decisions and trade-offs
- Create user guides for new features
- Explain everything in photography/wedding terms

### 5. Git Workflow
```bash
# Commit frequently with descriptive messages
git add .
git commit -m "Progress: [specific feature/fix completed]"
git push origin [branch-name]
```

### 6. Wedding Day Safety Checks
- Saturday deployments = ABSOLUTELY FORBIDDEN
- Response time must be <500ms
- Always have offline fallback
- Test with poor network conditions

### 7. Performance Requirements
- First Contentful Paint: <1.2s
- Time to Interactive: <2.5s  
- Lighthouse Score: >90
- Bundle size: <500KB initial

### 8. Final Quality Gates
- All TypeScript errors resolved
- All tests passing
- Security scan clean
- Mobile responsive verified
- Documentation updated
- Business logic verified