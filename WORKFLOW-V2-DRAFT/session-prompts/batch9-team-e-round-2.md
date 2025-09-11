# TEAM E - ROUND 2: WS-010 - Mobile Optimization - Cross-Platform Performance

**Date:** 2025-01-23  
**Feature ID:** WS-010 (Track all work with this ID)
**Priority:** P1 from roadmap  
**Mission:** Build comprehensive mobile optimization with PWA features, offline functionality, and cross-platform performance  
**Context:** You are Team E working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Bride checking wedding details on her phone during venue visits, vendor meetings, and planning sessions
**I want to:** Access all wedding information instantly on mobile with fast loading, offline access, and app-like experience
**So that:** I can reference timelines, share vendor info, and update details anywhere without being tied to a computer

**Real Wedding Problem This Solves:**
Wedding planning happens everywhere - at venues, with vendors, during travel. Couples need instant access to their wedding information on mobile devices. Slow-loading websites and poor mobile experiences create frustration during important planning moments. This optimization creates a seamless mobile experience.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:** WS-010
- Progressive Web App (PWA) implementation
- Offline functionality with service workers
- Mobile-first responsive design optimization
- Cross-platform performance optimization
- Touch-friendly interactions and gestures
- Mobile-specific features (camera, GPS, push notifications)

**Technology Stack (VERIFIED):**
- PWA: Service workers, app manifest, offline storage
- Performance: Image optimization, lazy loading, code splitting
- Touch: Gesture recognition, touch-optimized UI components
- Caching: Intelligent caching strategies for mobile
- Native: Web APIs for camera, location, notifications

**Integration Points:**
- [WS-008 Notification Engine]: Mobile push notifications
- [WS-011 Document Storage]: Mobile file access and upload
- [Database]: mobile_sessions, offline_sync, pwa_installations

---

## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

```typescript
// 1. CONTEXT7 MCP - Load latest docs:
await mcp__context7__resolve-library-id("workbox");
await mcp__context7__get-library-docs("/GoogleChrome/workbox", "service-workers pwa", 4000);
await mcp__context7__get-library-docs("/vercel/next.js", "pwa optimization", 3000);
await mcp__context7__resolve-library-id("sharp");
await mcp__context7__get-library-docs("/lovell/sharp", "image-optimization", 2000);

// 2. SERENA MCP - Initialize:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__search_for_pattern("mobile|pwa|responsive|touch");
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS

1. **task-tracker-coordinator** --think-hard "Build mobile optimization with PWA features"
2. **react-ui-specialist** --think-ultra-hard "Create mobile-first responsive components"
3. **performance-optimization-expert** --think-ultra-hard "Optimize mobile performance and loading"
4. **integration-specialist** --think-hard "Integrate mobile-specific APIs and features"

---

## 📋 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 2 (Mobile Features):
- [ ] Progressive Web App implementation with service workers
- [ ] Offline functionality for core features
- [ ] Mobile-first responsive design system
- [ ] Touch-optimized interactions and gestures
- [ ] Mobile performance optimization (Core Web Vitals)
- [ ] Integration with mobile-specific APIs
- [ ] Cross-platform testing and validation

---

## ✅ SUCCESS CRITERIA (NON-NEGOTIABLE)

- [ ] PWA installs and functions offline on all devices
- [ ] Mobile Core Web Vitals scores >90 (LCP <2.5s, FID <100ms)
- [ ] Touch interactions work smoothly on all screen sizes
- [ ] Offline sync preserves data without loss
- [ ] Mobile-specific features (camera, location) functional

---

## 💾 WHERE TO SAVE YOUR WORK

- Frontend: `/wedsync/src/components/mobile/`
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-e/WS-010-round-2-complete.md`

END OF ROUND PROMPT - EXECUTE IMMEDIATELY