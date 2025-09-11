# TEAM A - ROUND 2: WS-012 - Advanced Form Builder - React Components

**Date:** 2025-01-23  
**Feature ID:** WS-012 (Track all work with this ID)
**Priority:** P1 from roadmap  
**Mission:** Build drag-and-drop form builder with advanced field types, conditional logic, and real-time preview  
**Context:** You are Team A working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding photographer who needs different information from each client type (engagement, wedding, anniversary)
**I want to:** Create custom forms with conditional questions, file uploads, and signature fields without technical knowledge
**So that:** I can gather exactly the right information for each service while providing a professional client experience

**Real Wedding Problem This Solves:**
Wedding photographers currently use generic contact forms that don't capture specific needs. Engagement clients need location preferences, wedding clients need timeline details, and anniversary clients need different information entirely. This form builder creates custom forms for each service type with intelligent conditional logic.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:** WS-012
- Drag-and-drop form builder interface
- Advanced field types (signature, file upload, conditional logic)
- Real-time form preview and testing
- Form templates library for wedding industry
- Response analytics and completion tracking
- Integration with notification and document systems

**Technology Stack (VERIFIED):**
- Frontend: React 19, React DnD, Tailwind CSS v4
- Forms: React Hook Form, Zod validation
- Builder: Custom drag-drop interface with field palette
- Preview: Real-time form rendering engine
- Storage: Form definitions in PostgreSQL JSON fields

**Integration Points:**
- [WS-008 Notification Engine]: Form submission notifications
- [WS-007 Analytics Pipeline]: Form completion analytics
- [Database]: form_templates, form_responses, form_analytics

---

## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

```typescript
// 1. LOAD UI STYLE GUIDES:
await mcp__serena__read_file("/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");

// 2. CONTEXT7 MCP - Load latest docs:
await mcp__context7__resolve-library-id("react-hook-form");
await mcp__context7__get-library-docs("/react-hook-form/react-hook-form", "dynamic-forms validation", 4000);
await mcp__context7__resolve-library-id("react-dnd");
await mcp__context7__get-library-docs("/react-dnd/react-dnd", "drag-drop builder", 3000);
await mcp__context7__get-library-docs("/colinhacks/zod", "form-validation", 2000);

// 3. SERENA MCP - Initialize:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__search_for_pattern("form|builder|drag.*drop");
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS

1. **task-tracker-coordinator** --think-hard "Build advanced form builder with drag-drop interface"
2. **react-ui-specialist** --think-ultra-hard "Create form builder UI with real-time preview"
3. **integration-specialist** --think-hard "Integrate form submissions with notifications"
4. **test-automation-architect** --interaction-focused "Test form builder workflows"

---

## 📋 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 2 (Advanced Features):
- [ ] Drag-and-drop form builder interface
- [ ] Advanced field types (signature, file upload, multi-step)
- [ ] Conditional logic and field dependencies
- [ ] Real-time form preview and testing
- [ ] Form templates library for wedding services
- [ ] Response management and analytics
- [ ] Form embedding and sharing options

---

## ✅ SUCCESS CRITERIA (NON-NEGOTIABLE)

- [ ] Form builder creates functional forms via drag-drop
- [ ] Conditional logic shows/hides fields correctly
- [ ] Real-time preview matches published form exactly
- [ ] Form submissions integrate with notification system
- [ ] Advanced field types (signature, upload) functional

---

## 💾 WHERE TO SAVE YOUR WORK

- Frontend: `/wedsync/src/components/form-builder/`
- Pages: `/wedsync/src/app/(dashboard)/forms/`
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-a/WS-012-round-2-complete.md`

END OF ROUND PROMPT - EXECUTE IMMEDIATELY