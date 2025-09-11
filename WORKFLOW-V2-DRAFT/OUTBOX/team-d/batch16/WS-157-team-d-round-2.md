# TEAM D - ROUND 2: WS-157 - Helper Assignment - WedMe Mobile & Responsive Design

**Date:** 2025-01-25  
**Feature ID:** WS-157 (Track all work with this ID)  
**Priority:** P1 from roadmap  
**Mission:** Build mobile-optimized helper assignment with offline capabilities and couple experience enhancements  
**Context:** You are Team D working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding couple delegating tasks to family and friends
**I want to:** Assign specific wedding tasks to helpers with clear instructions and timing
**So that:** Everyone knows their responsibilities and can execute tasks without confusion on the wedding day

**Real Wedding Problem This Solves:**
A couple currently creates handwritten task lists like "Mom - handle gifts table" without clear timing or instructions. With this feature, they assign "Mary Johnson - Gift table setup (5:00pm-5:30pm) - Set up gift table in foyer, arrange card box, ensure gift security" with automatic notifications and check-in reminders.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification (Round 2 Focus):**
- Mobile-first helper assignment interface with touch optimization
- Offline helper assignment with sync capabilities
- WedMe couple mobile app integration
- Touch-friendly drag-and-drop operations
- Mobile notification system for assignments
- Responsive design for all screen sizes

**Technology Stack (VERIFIED):**
- Mobile: WedMe React Native app integration
- Frontend: Next.js 15 PWA capabilities
- Database: Offline IndexedDB with sync
- Notifications: Push notifications for mobile
- Touch: React Native Gesture Handler
- Offline: Service Workers for sync management

**Integration Points:**
- WedMe Mobile App: Native helper assignment interface
- Offline Sync: Background sync for assignments
- Push Notifications: Assignment alerts and updates
- Couple Experience: Streamlined mobile workflow

---

## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

```typescript
// 1. LOAD CORRECT UI STYLE GUIDE:
await mcp__serena__read_file("/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");

// 2. CONTEXT7 MCP - Load latest docs:
await mcp__context7__get-library-docs("/vercel/next.js", "pwa service-workers", 5000);
await mcp__context7__get-library-docs("/react-native-community/react-native", "gestures navigation", 3000);
await mcp__context7__get-library-docs("/expo/expo", "notifications push", 2000);

// 3. SERENA MCP - Initialize:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);

// 4. REVIEW existing Round 1 work:
await mcp__serena__find_symbol("HelperAssignment", "", true);
await mcp__serena__get_symbols_overview("/src/components/mobile");
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS

1. **task-tracker-coordinator** --mobile-focus "Track mobile helper assignment features"
2. **react-ui-specialist** --touch-optimization "Build mobile-optimized assignment interface"
3. **nextjs-fullstack-developer** --pwa-integration "Enhance PWA capabilities for offline assignment"
4. **security-compliance-officer** --mobile-security
5. **test-automation-architect** --mobile-testing
6. **playwright-visual-testing-specialist** --touch-interactions
7. **code-quality-guardian** --mobile-performance

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 2 (Enhancement & Polish):
- [ ] Mobile-first helper assignment interface with touch gestures
- [ ] Offline assignment capabilities with background sync
- [ ] WedMe mobile app integration components
- [ ] Push notification system for assignment updates
- [ ] Responsive helper directory with mobile search
- [ ] Touch-optimized drag-and-drop for task reassignment
- [ ] Mobile dashboard for assignment overview
- [ ] Couple experience optimization for mobile workflow

---

## 🔗 DEPENDENCIES

### Building on Round 1 Work:
- EXTEND: Basic helper assignment with mobile optimization
- ENHANCE: Desktop components with responsive design
- INTEGRATE: Offline capabilities with sync management

### What you NEED from other teams:
- FROM Team A: Frontend components - Required for mobile adaptation
- FROM Team B: API endpoints - Dependency for offline sync

### What other teams NEED from you:
- TO Team A: Mobile UI patterns - They need this for responsive design
- TO Team C: Offline requirements - Blocking their real-time integration

---

## ✅ SUCCESS CRITERIA (NON-NEGOTIABLE)

### Technical Implementation:
- [ ] Mobile interface loads within 3 seconds
- [ ] Touch gestures work smoothly on all devices
- [ ] Offline assignments sync when connection restored
- [ ] Push notifications deliver within 30 seconds
- [ ] Responsive design works on all screen sizes

### Evidence Package Required:
- [ ] Mobile interface screenshots on different devices
- [ ] Touch interaction video demonstrations
- [ ] Offline sync workflow documentation
- [ ] Push notification testing results

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Mobile Components: `/wedsync/src/components/mobile/helper-assignment/`
- PWA Features: `/wedsync/src/components/pwa/`
- Offline Sync: `/wedsync/src/lib/offline/helper-sync/`

### CRITICAL - Team Reports:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-d/batch16/WS-157-team-d-round-2-complete.md`

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY