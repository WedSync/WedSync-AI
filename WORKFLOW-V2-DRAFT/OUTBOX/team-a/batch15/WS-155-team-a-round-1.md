# TEAM A - ROUND 1: WS-155 - Guest Communications - Frontend UI for Bulk Messaging

**Date:** 2025-08-25  
**Feature ID:** WS-155 (Track all work with this ID)
**Priority:** P1 - Guest Management Core Feature  
**Mission:** Build intuitive bulk messaging interface with guest segmentation and personalization  
**Context:** You are Team A working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding couple communicating with guests
**I want to:** Send personalized bulk messages to different guest groups (dietary needs, RSVP status, plus-ones)
**So that:** I can efficiently communicate updates while maintaining personal touches for different guest segments

**Real Wedding Problem This Solves:**
Couples currently send generic "blast" emails to all 150+ guests, missing opportunities for personalization. "Vegetarian guests need different menu details than meat-eaters" or "Out-of-town guests need hotel information that locals don't." This system enables targeted, relevant communication.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
- Guest segmentation interface with smart filtering
- Message composition with personalization tokens
- Bulk email and SMS sending with delivery tracking
- Template management and message history

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Email: Integration with existing email service (Resend/SendGrid)  
- SMS: Twilio integration for text messaging
- Testing: Playwright MCP, Vitest
- Editor: Rich text editor for message composition

**Integration Points:**
- Guest Management: Pull guest data and segmentation
- Communication Service: Team B's messaging APIs
- Delivery Tracking: Team C's status monitoring

---

## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

```typescript
// 1. LOAD CORRECT UI STYLE GUIDE:
await mcp__serena__read_file("/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");

// 2. CONTEXT7 MCP - Load messaging UI docs:
await mcp__context7__resolve_library_id("next.js");
await mcp__context7__get_library_docs("/vercel/next.js", "forms server-actions", 5000);
await mcp__context7__get_library_docs("/react/react", "state-management bulk-operations", 4000);
await mcp__context7__get_library_docs("/tailwindlabs/tailwindcss", "messaging-layouts", 3000);
await mcp__context7__get_library_docs("/rich-text-editors/slate", "message-composition", 3000);

// 3. SERENA MCP - Initialize codebase:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// 4. REVIEW existing guest management patterns:
await mcp__serena__find_symbol("GuestList", "", true);
await mcp__serena__get_symbols_overview("src/components/guests");
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS

1. **task-tracker-coordinator** --messaging-ui-focus --bulk-operations
2. **react-ui-specialist** --form-components --rich-text-editing
3. **nextjs-fullstack-developer** --component-architecture --guest-integration  
4. **security-compliance-officer** --messaging-security --spam-prevention
5. **test-automation-architect** --messaging-workflows --accessibility
6. **playwright-visual-testing-specialist** --bulk-operations-testing

---

## 📋 STEP 3: ROUND 1 DELIVERABLES (Core Implementation)

### **MAIN COMPONENT: GuestCommunications**
- [ ] **Guest Segmentation Panel** - Filter guests by dietary needs, RSVP status, location
- [ ] **Message Composition Interface** - Rich text editor with personalization tokens
- [ ] **Bulk Send Configuration** - Email/SMS selection, scheduling, preview
- [ ] **Delivery Status Dashboard** - Track sent/delivered/opened status
- [ ] **Template Management** - Save and reuse common message templates

### **SUPPORTING COMPONENTS:**
- [ ] **GuestFilterBuilder** - Dynamic guest filtering with multiple criteria
- [ ] **PersonalizationTokens** - Insert guest names, dietary info, plus-one details
- [ ] **MessagePreview** - Preview personalized messages before sending
- [ ] **DeliveryStatusIndicator** - Visual status for each recipient
- [ ] **MessageHistory** - Archive of all sent communications

### **RESPONSIVE DESIGN:**
- [ ] **Desktop Layout** (1920px+) - Full composition interface with preview
- [ ] **Tablet Layout** (768px-1919px) - Touch-optimized message creation
- [ ] **Mobile Fallback** (375px-767px) - Essential messaging functions

---

## 🔗 DEPENDENCIES

### What you NEED from other teams:
- FROM Team B: Messaging API endpoints and delivery confirmation
- FROM Team C: Integration with email/SMS providers and status tracking
- FROM Team E: Guest data queries and segmentation logic

### What other teams NEED from you:
- TO Team B: Message composition data structure and API requirements
- TO Team D: Mobile messaging interface specifications

---

## 🔒 SECURITY REQUIREMENTS (MANDATORY)

```typescript
// REQUIRED: Secure messaging validation
import { withSecureValidation } from '@/lib/validation/middleware';
import { guestCommunicationSchema } from '@/lib/validation/schemas';

export const GuestMessaging = ({ coupleId }: { coupleId: string }) => {
  const sendMessage = async (messageData: MessageData) => {
    // CRITICAL: Validate couple owns all recipient guests
    await validateGuestOwnership(coupleId, messageData.recipientIds);
    
    // Prevent spam and abuse
    await rateLimitMessaging(coupleId);
    
    // Sanitize message content
    const sanitizedContent = sanitizeHTML(messageData.content);
    
    return await submitMessage({ ...messageData, content: sanitizedContent });
  };
};
```

**Security Checklist:**
- [ ] Validate couple ownership of all recipient guests
- [ ] Implement rate limiting for bulk messaging (max 5 sends/hour)
- [ ] Sanitize all message content for XSS prevention
- [ ] Validate email addresses and phone numbers before sending
- [ ] Implement unsubscribe mechanism for guest privacy

---

## 🎭 PLAYWRIGHT TESTING REQUIREMENTS

```javascript
// MANDATORY: Bulk messaging workflow testing
await mcp__playwright__browser_navigate({url: "http://localhost:3000/communications"});

// 1. GUEST SEGMENTATION TESTING
await mcp__playwright__browser_click({element: "dietary-filter", ref: "vegetarian"});
await mcp__playwright__browser_wait_for({text: "8 vegetarian guests selected"});

// 2. MESSAGE COMPOSITION TESTING
await mcp__playwright__browser_type({
  element: "message-editor", 
  ref: "composition-area",
  text: "Dear {guest_name}, the vegetarian menu includes..."
});

// 3. PERSONALIZATION TESTING
await mcp__playwright__browser_click({element: "preview-messages", ref: "preview-btn"});
await mcp__playwright__browser_wait_for({text: "Dear Sarah, the vegetarian menu includes..."});

// 4. BULK SEND TESTING (TEST MODE)
await mcp__playwright__browser_click({element: "send-test", ref: "test-mode"});
await mcp__playwright__browser_wait_for({text: "8 test messages queued"});
```

---

## ✅ SUCCESS CRITERIA (Round 1)

**You CANNOT claim completion unless:**
- [ ] Guest segmentation working with complex filtering
- [ ] Message composition with personalization tokens functional
- [ ] Bulk messaging interface handles 200+ recipients
- [ ] Responsive design working at all breakpoints
- [ ] Unit tests written FIRST and passing (>80% coverage)
- [ ] Playwright tests validating full messaging workflows
- [ ] Zero TypeScript errors
- [ ] Zero console errors
- [ ] Security validation for messaging operations implemented

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Frontend: `/wedsync/src/components/communications/`
- Types: `/wedsync/src/types/communications.ts`
- Tests: `/wedsync/tests/communications/ui/`

### CRITICAL - Team Output:
**Save to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-a/batch15/WS-155-team-a-round-1-complete.md`

---

## ⚠️ CRITICAL WARNINGS
- Do NOT implement email/SMS sending (Team B's responsibility)
- Do NOT create database schemas (Team E's responsibility)
- Do NOT skip spam prevention measures
- REMEMBER: Teams B, C, D, E work in parallel - coordinate interfaces

---

END OF ROUND 1 PROMPT - EXECUTE IMMEDIATELY