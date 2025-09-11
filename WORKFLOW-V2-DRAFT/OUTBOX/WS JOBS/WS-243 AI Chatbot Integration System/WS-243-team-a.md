# TEAM A - ROUND 1: WS-243 - AI Chatbot Integration System
## 2025-01-20 - Development Round 1

**YOUR MISSION:** Build the frontend chatbot widget and UI components with real-time messaging interface
**FEATURE ID:** WS-243 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round  
**THINK ULTRA HARD** about real-time chat UX and AI conversation flows

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/components/chatbot/
cat $WS_ROOT/wedsync/src/components/chatbot/ChatWidget.tsx | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test chatbot
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

// Query existing chat/messaging patterns
await mcp__serena__search_for_pattern("chat|message|conversation");
await mcp__serena__find_symbol("MessageBubble", "", true);
await mcp__serena__get_symbols_overview("src/components/communication");
```

### B. UI STYLE GUIDES & TECHNOLOGY STACK (MANDATORY FOR ALL UI WORK)
```typescript
// CRITICAL: Load the correct UI Style Guide
// General SaaS UI (Most features):
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
// Load documentation SPECIFIC to real-time features
# Use Ref MCP to search for relevant documentation about WebSocket, real-time UI, and chat interfaces
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR COMPLEX FEATURE PLANNING

### Use Sequential Thinking MCP for Complex Analysis
```typescript
// Use for complex architectural decisions
mcp__sequential-thinking__sequential_thinking({
  thought: "I need to design a real-time chatbot widget that integrates seamlessly with WedSync's UI. Key considerations: 1) Real-time WebSocket connection for instant responses 2) Wedding industry context awareness 3) Integration with existing authentication 4) Mobile-responsive design 5) Loading states and error handling for AI responses...",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 5
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

Launch these agents with comprehensive requirements:

1. **task-tracker-coordinator** - Break down chatbot UI components and dependencies
2. **react-ui-specialist** - Ensure React 19 patterns and performance optimization  
3. **security-compliance-officer** - Validate input sanitization and XSS prevention
4. **code-quality-guardian** - Maintain TypeScript strictness and component patterns
5. **test-automation-architect** - Create comprehensive component tests
6. **documentation-chronicler** - Document chat widget integration patterns

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### CHATBOT UI SECURITY CHECKLIST:
- [ ] **Input sanitization** - All user messages sanitized before display
- [ ] **XSS prevention** - Proper HTML escaping for AI responses
- [ ] **Authentication check** - Verify user session before chat access
- [ ] **Rate limiting UI** - Show rate limit warnings to users
- [ ] **Content validation** - Validate all message content before sending
- [ ] **Error message sanitization** - Never leak system information
- [ ] **File upload security** - Validate file types and sizes for attachments

## 🧭 NAVIGATION INTEGRATION REQUIREMENTS (MANDATORY FOR UI FEATURES)

**❌ FORBIDDEN: Creating standalone chatbot without navigation integration**
**✅ MANDATORY: Chatbot widget must integrate across all dashboard pages**

### NAVIGATION INTEGRATION CHECKLIST
- [ ] Floating chat widget available on all dashboard pages
- [ ] Persistent chat state across page navigation  
- [ ] Mobile chat interface with bottom sheet pattern
- [ ] Accessibility labels for screen readers
- [ ] Keyboard navigation support for chat interface
- [ ] Chat history persistence across sessions

## 🎯 TEAM A SPECIALIZATION: FRONTEND/UI FOCUS

**FRONTEND/UI FOCUS:**
- React components with TypeScript (React 19 patterns)
- Responsive UI (375px, 768px, 1920px breakpoints)
- Untitled UI + Magic UI components only
- Real-time UI updates and loading states
- Accessibility compliance (WCAG 2.1 AA)
- Component performance <200ms interactions

## 📋 TECHNICAL SPECIFICATION FROM WS-243

**Core Requirements:**
- Intelligent AI-powered chatbot system with OpenAI GPT-4 integration
- Real-time chat interface with typing indicators and presence
- Contextual help based on current page/task
- Multi-language support (starting with EN, ES, FR)
- Seamless escalation to human support
- Conversation memory and context retention
- Mobile-responsive design with touch optimization

**Key Components to Build:**
1. **ChatWidget** - Main floating chat interface
2. **MessageBubble** - Individual message display with AI/user distinction  
3. **TypingIndicator** - Realistic AI thinking animation
4. **ChatHistory** - Conversation persistence and scrolling
5. **AttachmentUpload** - File sharing for screenshots/context
6. **EscalationInterface** - Handoff to human support

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1

### PRIMARY COMPONENTS:
1. **ChatWidget (`/components/chatbot/ChatWidget.tsx`)**
   ```typescript
   interface ChatWidgetProps {
     position?: 'bottom-right' | 'bottom-left' | 'sidebar';
     initialMessage?: string;
     contextHint?: string;
     minimized?: boolean;
   }
   ```

2. **MessageBubble (`/components/chatbot/MessageBubble.tsx`)**
   ```typescript
   interface MessageBubbleProps {
     message: ChatMessage;
     isBot: boolean;
     timestamp: Date;
     showAvatar?: boolean;
   }
   ```

3. **TypingIndicator (`/components/chatbot/TypingIndicator.tsx`)**
   - Animated dots with realistic AI timing
   - "AI is thinking..." status with progress indication
   - Estimated response time display

4. **ChatInput (`/components/chatbot/ChatInput.tsx`)**
   - Auto-expanding textarea
   - File attachment support
   - Send button with loading states
   - Character/message limits display

### INTEGRATION REQUIREMENTS:
- [ ] WebSocket connection management for real-time updates
- [ ] Integration with existing authentication system
- [ ] Context-aware help suggestions based on current page
- [ ] Conversation persistence in browser storage
- [ ] Error handling and retry mechanisms
- [ ] Responsive design for mobile/desktop

### TESTING REQUIREMENTS:
- [ ] Component unit tests with React Testing Library
- [ ] Real-time messaging simulation tests
- [ ] Accessibility testing with jest-axe
- [ ] Mobile responsiveness tests
- [ ] Error boundary testing

## 💾 WHERE TO SAVE YOUR WORK

**Component Files:**
- `$WS_ROOT/wedsync/src/components/chatbot/` - Main chat components
- `$WS_ROOT/wedsync/src/hooks/useChat.ts` - Chat state management hook
- `$WS_ROOT/wedsync/src/types/chatbot.ts` - TypeScript interfaces

**Test Files:**
- `$WS_ROOT/wedsync/tests/components/chatbot/` - Component tests
- `$WS_ROOT/wedsync/tests/hooks/useChat.test.ts` - Hook tests

**Documentation:**
- `$WS_ROOT/WORKFLOW-V2-DRAFT/INBOX/senior-dev/WS-243-team-a-round-1-complete.md`

## 🏁 COMPLETION CHECKLIST

### EVIDENCE REQUIREMENTS:
- [ ] All component files created and verified to exist
- [ ] TypeScript compilation successful (npm run typecheck)
- [ ] All component tests passing (npm test chatbot)
- [ ] Chat widget integrated into dashboard layout
- [ ] Mobile responsive testing completed
- [ ] Accessibility testing passed

### FUNCTIONALITY REQUIREMENTS:
- [ ] Chat widget opens/closes smoothly with animations
- [ ] Real-time message sending and receiving simulation
- [ ] Typing indicators work with realistic timing
- [ ] File attachment UI (backend integration comes later)
- [ ] Error states and loading animations
- [ ] Context-aware help suggestions UI

### INTEGRATION REQUIREMENTS:
- [ ] Widget available across all dashboard pages
- [ ] Persistent state during navigation
- [ ] Authentication integration hooks prepared
- [ ] Mobile-first responsive design
- [ ] Proper TypeScript interfaces exported

---

**EXECUTE IMMEDIATELY - Focus on creating polished, real-time chat UI components that wedding suppliers will love using!**

**🎯 SUCCESS METRIC**: Create a chat widget so intuitive and responsive that users prefer it over traditional support channels.