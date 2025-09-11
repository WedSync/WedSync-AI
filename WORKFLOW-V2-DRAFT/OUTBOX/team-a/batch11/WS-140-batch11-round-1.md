# TEAM A - ROUND 1: WS-140 - Trial Management System - Frontend Core Implementation

**Date:** 2025-08-24  
**Feature ID:** WS-140 (Track all work with this ID)
**Priority:** P0 from roadmap  
**Mission:** Implement comprehensive trial management dashboard and user experience  
**Context:** You are Team A working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding venue coordinator trying WedSync for the first time
**I want to:** Get 30 days to test all Professional features with my real wedding clients
**So that:** I can see the time savings and value before committing to a paid subscription

**Real Wedding Problem This Solves:**
A venue coordinator signs up and imports their 15 upcoming weddings. Over 30 days, they test automated timelines, guest management, and supplier coordination. After seeing 10+ hours saved per week, they qualify for a 15-day extension and ultimately convert to Professional tier.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
- 30-day Professional tier trial for new signups
- Activity tracking and scoring system
- Smart trial extension (15 days, once per account)
- Trial status dashboard widget with countdown
- Automated email sequences for trial engagement
- Conversion tracking and analytics
- Feature usage monitoring

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Database: PostgreSQL via MCP Server (✅ CONNECTED - Direct Supabase access available)
- Backend: Supabase (PostgreSQL 15), Edge Functions
- Testing: Playwright MCP, Vitest
- Analytics: Custom event tracking

**Integration Points:**
- Dashboard: Add trial status widget to main dashboard
- Navigation: Trial progress indicators in header
- Billing: Integration with subscription system
- Email: Automated trial sequence triggers

---

## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

**⚠️ CRITICAL: Complete this BEFORE any coding or agent work begins!**

```typescript
// 1. LOAD CORRECT UI STYLE GUIDE (MANDATORY FOR ALL UI WORK):
await mcp__serena__read_file("/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");

// 2. CONTEXT7 MCP - Load latest docs for THIS SPECIFIC TASK:
await mcp__context7__resolve-library-id("react");
await mcp__context7__get-library-docs("/facebook/react", "hooks useState useEffect", 2000);
await mcp__context7__get-library-docs("/vercel/next.js", "app-router dashboard", 2000);
await mcp__context7__get-library-docs("/tailwindcss/tailwindcss", "components widgets", 1500);

// 3. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);

// 4. REVIEW existing patterns:
await mcp__serena__find_symbol("DashboardWidget", "", true);
await mcp__serena__get_symbols_overview("/src/components/dashboard");
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS

1. **task-tracker-coordinator** --think-hard "Track trial management implementation"
2. **react-ui-specialist** --think-hard "Trial dashboard widgets and UI"
3. **ui-ux-designer** --think-ultra-hard "Trial user experience optimization"
4. **test-automation-architect** --tdd-approach
5. **code-quality-guardian** --match-codebase-style

---

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1

### Core Frontend Components:
- [ ] **TrialStatusWidget Component**: Main dashboard widget showing trial days left
- [ ] **TrialProgressBar Component**: Visual progress indicator with milestones
- [ ] **TrialChecklist Component**: Onboarding checklist for trial users
- [ ] **TrialBanner Component**: Header banner with countdown and CTA
- [ ] **Activity tracking hooks**: useTrialActivity, useTrialStatus
- [ ] **Unit tests**: >80% coverage for all components
- [ ] **Playwright tests**: Trial widget interactions

---

## 🔗 DEPENDENCIES

### What you NEED from other teams:
- FROM Team B: Trial API endpoints - Required for data fetching

### What other teams NEED from you:
- TO Team B: Component interfaces and data requirements
- TO Team E: UI components for testing

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Components: `/wedsync/src/components/trial/`
- Hooks: `/wedsync/src/hooks/useTrial*.ts`
- Tests: `/wedsync/tests/trial/`

### Team Report:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-a/batch11/WS-140-round-1-complete.md`

---

END OF ROUND 1 PROMPT - EXECUTE IMMEDIATELY