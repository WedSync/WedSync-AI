# TEAM D - ROUND 1: WS-279 - Guest Communication Hub
## 2025-01-20 - Development Round 1

**YOUR MISSION:** Build mobile-optimized guest communication for WedMe platform with offline capabilities
**FEATURE ID:** WS-279 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round
**THINK ULTRA HARD** about mobile communication workflows and touch-optimized guest management

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/components/wedme/guests/
cat $WS_ROOT/wedsync/src/components/wedme/guests/MobileGuestCommunication.tsx | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test wedme-guest-communication
# MUST show: "All tests passing"
```

## 🎯 TEAM D SPECIALIZATION: MOBILE/WEDME PLATFORM FOCUS

**Core Mobile Components:**

1. **MobileGuestCommunication** - Touch-optimized guest messaging interface
2. **MobileRSVPTracker** - Swipe-friendly RSVP management
3. **QuickGuestActions** - One-tap communication for common scenarios
4. **OfflineGuestSync** - Offline guest data and message queuing
5. **TouchGuestFilters** - Mobile-friendly guest segmentation
6. **MobileMessageComposer** - Simplified message creation for mobile

### Key Mobile Features:
- Touch-optimized guest list with swipe actions
- Quick message templates optimized for mobile
- One-tap RSVP follow-ups and reminders
- Offline guest communication queuing
- Mobile-native sharing integration
- Progressive Web App push notifications

## 💾 WHERE TO SAVE YOUR WORK
- Components: $WS_ROOT/wedsync/src/components/wedme/guests/
- PWA: $WS_ROOT/wedsync/src/lib/pwa/guest-communication/
- Types: $WS_ROOT/wedsync/src/types/wedme-guest-communication.ts
- Tests: $WS_ROOT/wedsync/__tests__/mobile/guests/
- Reports: $WS_ROOT/WORKFLOW-V2-DRAFT/INBOX/senior-dev/

---

**EXECUTE IMMEDIATELY - Build the mobile guest communication that couples can use anywhere!**