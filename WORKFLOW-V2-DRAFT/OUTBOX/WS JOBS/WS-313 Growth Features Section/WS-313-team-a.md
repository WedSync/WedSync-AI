# TEAM A - ROUND 1: WS-313 - Growth Features Section Overview
## 2025-01-22 - Development Round 1

**YOUR MISSION:** Build referral program interface, review collection system, and directory listing management for wedding supplier growth
**FEATURE ID:** WS-313 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round
**THINK ULTRA HARD** about viral growth mechanics and automated review collection

## 🚨 EVIDENCE OF REALITY REQUIREMENTS
```bash
ls -la $WS_ROOT/wedsync/src/components/growth/
npm run typecheck  # MUST show: "No errors found"
npm test growth-features  # MUST show: "All tests passing"
```

## 📚 CODEBASE ANALYSIS
```typescript
await mcp__serena__activate_project("$WS_ROOT/wedsync");
await mcp__serena__search_for_pattern("referral.*program|review.*collection|growth.*metrics");
```

## 🧠 SEQUENTIAL THINKING
```typescript
mcp__sequential-thinking__sequential_thinking({
  thought: "Growth features need: 1) Referral tracking with unique codes, 2) Automated review requests post-wedding, 3) Directory listing sync, 4) Growth metrics dashboard, 5) Viral sharing components.",
  thoughtNumber: 1,
  totalThoughts: 4
});
```

## 🎯 TEAM A DELIVERABLES
- [ ] ReferralProgramDashboard.tsx with tracking code generation
- [ ] ReviewCollectionSystem.tsx with automated email/SMS triggers
- [ ] DirectoryListingManager.tsx for platform synchronization
- [ ] GrowthMetrics.tsx dashboard with conversion tracking
- [ ] ViralSharingComponents.tsx for portfolio sharing

## 🔒 SECURITY REQUIREMENTS
- [ ] Validate referral codes and prevent manipulation
- [ ] Secure review collection without exposing client data
- [ ] Rate limiting on growth feature actions
- [ ] Audit logging for referral rewards

## 💾 FILES TO CREATE
- Main: `$WS_ROOT/wedsync/src/components/growth/GrowthDashboard.tsx`
- Referrals: `$WS_ROOT/wedsync/src/components/growth/ReferralProgram.tsx`
- Reviews: `$WS_ROOT/wedsync/src/components/growth/ReviewCollection.tsx`
- Directory: `$WS_ROOT/wedsync/src/components/growth/DirectoryListings.tsx`
- Tests: `$WS_ROOT/wedsync/src/__tests__/components/growth/`

## 🏁 COMPLETION CHECKLIST
- [ ] All components created and type-safe
- [ ] Growth dashboard with viral coefficient tracking
- [ ] Referral system with unique code generation
- [ ] Automated review collection workflows
- [ ] Directory listing management interface
- [ ] Mobile-responsive design
- [ ] Unit tests >90% coverage

**EXECUTE IMMEDIATELY - Build viral growth engine for wedding platform success!**