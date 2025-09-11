# TEAM A - ROUND 1: WS-295 - Real-time Systems Main Overview
## 2025-09-03 - Development Round 1

**YOUR MISSION:** Build real-time UI components and collaboration interfaces for instant wedding data synchronization with live presence indicators
**FEATURE ID:** WS-295 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round  
**THINK ULTRA HARD** about real-time user experience, live collaboration UX, and wedding coordination visual feedback

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/components/realtime/
cat $WS_ROOT/wedsync/src/components/realtime/RealtimeCollaboration.tsx | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test realtime collaboration
# MUST show: "All tests passing"
```

**Teams submitting hallucinated implementations will be rejected immediately.**

## 📚 STEP 1: ENHANCED DOCUMENTATION & CODEBASE ANALYSIS (MANDATORY - 10 MINUTES!)

### A. SERENA PROJECT ACTIVATION (MINUTES 1-3)
```typescript
// CRITICAL: Activate Serena for semantic code understanding
await mcp__serena__activate_project("$WS_ROOT/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// Query existing real-time and collaboration UI patterns
await mcp__serena__search_for_pattern("realtime websocket collaboration presence ui components");
await mcp__serena__find_symbol("Realtime Websocket Collaboration", "", true);
await mcp__serena__get_symbols_overview("$WS_ROOT/wedsync/src/components/realtime/");
```

### B. UI STYLE GUIDES & TECHNOLOGY STACK (MANDATORY FOR ALL UI WORK)
```typescript
// CRITICAL: Load the correct UI Style Guide for real-time interfaces
await mcp__serena__read_file("$WS_ROOT/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");
```

**🚨 CRITICAL UI TECHNOLOGY STACK:**
- **Untitled UI**: Primary component library (MANDATORY)
- **Magic UI**: Animations and visual enhancements (MANDATORY)
- **Tailwind CSS 4.1.11**: Utility-first CSS
- **Lucide React**: Icons ONLY

**❌ DO NOT USE:**
- Radix UI, Catalyst UI, shadcn/ui, or any other component libraries

### C. REF MCP CURRENT DOCS (MINUTES 3-5)
```typescript
// Load documentation SPECIFIC to real-time UI and WebSocket integration
mcp__Ref__ref_search_documentation("real-time UI WebSocket collaboration presence indicators React components");
mcp__Ref__ref_search_documentation("wedding coordination real-time collaboration supplier couple live updates");
```

## 🎯 TEAM A SPECIALIZATION: FRONTEND/UI FOCUS

**FRONTEND/UI FOCUS:**
- Real-time UI components with WebSocket integration
- Live collaboration interfaces with presence indicators
- Instant data synchronization visual feedback
- Wedding coordination collaboration tools
- Real-time form updates and conflict resolution UI
- Presence tracking and availability indicators
- Performance-optimized real-time component updates

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1

### Core Real-time UI Components:
- [ ] `RealtimeCollaboration.tsx` - Main collaboration interface
- [ ] `PresenceIndicator.tsx` - Live user presence visualization
- [ ] `LiveFormSync.tsx` - Real-time form synchronization
- [ ] `WeddingCoordinationBoard.tsx` - Live wedding planning collaboration
- [ ] `RealtimeNotifications.tsx` - Instant notification system

### Wedding Context Integration:
- [ ] Real-time vendor coordination interface
- [ ] Live couple-supplier collaboration tools
- [ ] Wedding planning progress indicators
- [ ] Real-time availability calendars
- [ ] Live chat and messaging components

## 💾 WHERE TO SAVE YOUR WORK
- **Real-time Components**: `$WS_ROOT/wedsync/src/components/realtime/`
- **Tests**: `$WS_ROOT/wedsync/tests/realtime/`
- **Evidence Package**: `$WS_ROOT/WORKFLOW-V2-DRAFT/INBOX/senior-dev/WS-295-realtime-ui-evidence.md`

---

**EXECUTE IMMEDIATELY - Focus on real-time wedding collaboration UI with live presence and instant synchronization!**