# TEAM A - ROUND 1: WS-244 - Real-Time Collaboration System
## 2025-01-20 - Development Round 1

**YOUR MISSION:** Build the frontend real-time collaboration interface with collaborative editing, presence indicators, and conflict resolution UI
**FEATURE ID:** WS-244 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round  
**THINK ULTRA HARD** about real-time synchronization, user presence, and collaborative editing UX

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/components/collaboration/
cat $WS_ROOT/wedsync/src/components/collaboration/CollaborativeEditor.tsx | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test collaboration
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

// Query existing collaboration and real-time patterns
await mcp__serena__search_for_pattern("collaboration|realtime|websocket|editor");
await mcp__serena__find_symbol("RealtimeProvider", "", true);
await mcp__serena__get_symbols_overview("src/components/realtime");
```

### B. UI STYLE GUIDES & TECHNOLOGY STACK (MANDATORY FOR ALL UI WORK)
```typescript
// CRITICAL: Load the correct UI Style Guide
await mcp__serena__read_file("$WS_ROOT/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");
```

**🚨 CRITICAL UI TECHNOLOGY STACK:**
- **Untitled UI**: Primary component library (MANDATORY)
- **Magic UI**: Animations and visual enhancements (MANDATORY)
- **Tailwind CSS 4.1.11**: Utility-first CSS
- **Lucide React**: Icons ONLY
- **Monaco Editor**: Code/text editing with real-time collaboration
- **Y.js + Yjs-WebSocket**: Operational Transform for conflict-free replicated data

**❌ DO NOT USE:**
- Radix UI, Catalyst UI, shadcn/ui, or any other component libraries

### C. REF MCP CURRENT DOCS (MINUTES 3-5)
```typescript
// Load documentation SPECIFIC to real-time collaboration and operational transform
# Use Ref MCP to search for Y.js, operational transform, real-time editing, and collaborative UI patterns
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR COLLABORATIVE EDITING

### Use Sequential Thinking MCP for Complex Analysis
```typescript
mcp__sequential-thinking__sequential_thinking({
  thought: "I need to design a real-time collaborative editing system for wedding planning documents. Key considerations: 1) Operational Transform with Y.js for conflict resolution 2) Real-time presence indicators showing who's editing where 3) User avatars and cursors with smooth animations 4) Document versioning and change history 5) Collaborative comment system 6) Mobile-responsive editing interface 7) WebSocket connection management with reconnection logic. The system must handle multiple users editing simultaneously without conflicts.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 5
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

Launch these agents with comprehensive requirements:

1. **task-tracker-coordinator** - Map collaborative editing components and real-time features
2. **react-ui-specialist** - Ensure React 19 patterns and performance optimization for real-time UI
3. **security-compliance-officer** - Validate secure real-time data transmission
4. **code-quality-guardian** - Maintain TypeScript strictness and component patterns
5. **test-automation-architect** - Create comprehensive tests for collaborative features
6. **documentation-chronicler** - Document collaboration patterns and user flows

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### COLLABORATION SECURITY CHECKLIST:
- [ ] **Real-time data encryption** - All WebSocket messages encrypted in transit
- [ ] **User authentication** - Verify user permissions for each collaboration session
- [ ] **Session validation** - Validate collaboration session ownership
- [ ] **Input sanitization** - All collaborative edits sanitized before broadcast
- [ ] **Rate limiting** - Prevent spam edits and abuse
- [ ] **Presence privacy** - Users can control visibility of their presence
- [ ] **Document access control** - Enforce read/write permissions per user
- [ ] **Audit logging** - Log all collaborative actions for security

## 🧭 NAVIGATION INTEGRATION REQUIREMENTS (MANDATORY FOR UI FEATURES)

**❌ FORBIDDEN: Creating collaboration features without navigation integration**
**✅ MANDATORY: Collaborative editing must integrate across wedding planning workflows**

### NAVIGATION INTEGRATION CHECKLIST
- [ ] Collaboration toolbar available in all document editing contexts
- [ ] Presence indicators in sidebar navigation
- [ ] Real-time notifications for collaboration events
- [ ] Deep links to collaborative sessions
- [ ] Breadcrumb navigation showing collaboration context
- [ ] Mobile collaboration interface with touch optimization

## 🎯 TEAM A SPECIALIZATION: FRONTEND/UI FOCUS

**FRONTEND/UI FOCUS:**
- React components with TypeScript (React 19 patterns)
- Responsive UI (375px, 768px, 1920px breakpoints)
- Untitled UI + Magic UI components only
- Real-time UI updates and smooth animations
- Accessibility compliance (WCAG 2.1 AA)
- Performance optimization for real-time features

## 📋 TECHNICAL SPECIFICATION FROM WS-244

**Core Requirements:**
- Real-time collaborative editing with Operational Transform
- User presence indicators and cursor positions
- Document version control and change history
- Collaborative commenting and annotation system
- Multi-user selection and highlighting
- Conflict resolution with automatic merge
- Live document sharing and permission management
- Mobile-responsive collaborative interface

**Key Components to Build:**
1. **CollaborativeEditor** - Main collaborative editing interface
2. **PresenceIndicator** - Real-time user presence display
3. **CollaborationToolbar** - Collaboration controls and settings
4. **UserCursor** - Other users' cursor positions
5. **ChangeHistory** - Document version history viewer
6. **CommentThread** - Collaborative commenting system

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1

### PRIMARY COMPONENTS:

1. **CollaborativeEditor (`/components/collaboration/CollaborativeEditor.tsx`)**
   ```typescript
   interface CollaborativeEditorProps {
     documentId: string;
     initialContent: string;
     permissions: 'read' | 'write' | 'admin';
     onContentChange: (content: string, operation: Operation) => void;
   }
   ```

2. **PresenceIndicator (`/components/collaboration/PresenceIndicator.tsx`)**
   ```typescript
   interface PresenceIndicatorProps {
     users: CollaborationUser[];
     currentUser: User;
     showCursors: boolean;
     showAvatars: boolean;
   }
   ```

3. **CollaborationToolbar (`/components/collaboration/CollaborationToolbar.tsx`)**
   ```typescript
   interface CollaborationToolbarProps {
     sessionId: string;
     permissions: CollaborationPermissions;
     onInviteUser: () => void;
     onShareDocument: () => void;
   }
   ```

4. **UserCursor (`/components/collaboration/UserCursor.tsx`)**
   - Animated cursor positions for other users
   - User name labels and avatar indicators
   - Smooth position transitions
   - Mobile-friendly cursor representation

### REAL-TIME INTEGRATION:

1. **WebSocket Connection Management**:
   ```typescript
   // Hook for managing real-time collaboration connection
   const useCollaboration = (documentId: string) => {
     // Y.js document synchronization
     // WebSocket connection management
     // Operational Transform conflict resolution
     // User presence tracking
   };
   ```

2. **Operational Transform Implementation**:
   - Y.js integration for conflict-free editing
   - Change detection and synchronization
   - Undo/redo with collaborative history
   - Character-level change tracking

3. **Presence System**:
   ```typescript
   interface PresenceData {
     userId: string;
     userName: string;
     avatar: string;
     cursorPosition: number;
     selection: { start: number; end: number };
     lastActivity: Date;
   }
   ```

### COLLABORATION FEATURES:

1. **Document Sharing Interface**:
   ```typescript
   // Share dialog with permission controls
   // Invitation system with email integration
   // Link sharing with access controls
   // Permission management UI
   ```

2. **Change History Viewer**:
   ```typescript
   // Timeline of document changes
   // User attribution for each change
   // Diff viewer with highlighting
   // Restore to previous version capability
   ```

3. **Collaborative Comments**:
   ```typescript
   // Threaded comment system
   // Mention system with notifications
   // Resolve/unresolve comment workflow
   // Comment anchoring to specific content
   ```

## 💾 WHERE TO SAVE YOUR WORK

**Component Files:**
- `$WS_ROOT/wedsync/src/components/collaboration/` - Main collaboration components
- `$WS_ROOT/wedsync/src/hooks/useCollaboration.ts` - Real-time collaboration hook
- `$WS_ROOT/wedsync/src/types/collaboration.ts` - TypeScript interfaces

**Real-time Integration:**
- `$WS_ROOT/wedsync/src/lib/collaboration/yjs-provider.ts` - Y.js WebSocket provider
- `$WS_ROOT/wedsync/src/lib/collaboration/operational-transform.ts` - OT utilities

**Test Files:**
- `$WS_ROOT/wedsync/tests/components/collaboration/` - Component tests
- `$WS_ROOT/wedsync/tests/hooks/useCollaboration.test.ts` - Hook tests

**Reports:**
- `$WS_ROOT/WORKFLOW-V2-DRAFT/INBOX/senior-dev/WS-244-team-a-round-1-complete.md`

## 🏁 COMPLETION CHECKLIST

### EVIDENCE REQUIREMENTS:
- [ ] All collaboration components created and verified to exist
- [ ] TypeScript compilation successful (npm run typecheck)
- [ ] All component tests passing (npm test collaboration)
- [ ] Real-time editing working with multiple simulated users
- [ ] Mobile responsive testing completed
- [ ] Accessibility testing passed with screen reader support

### FUNCTIONALITY REQUIREMENTS:
- [ ] Collaborative editor supporting multiple users simultaneously
- [ ] Real-time presence indicators with smooth animations
- [ ] User cursors and selections visible to other users
- [ ] Document sharing and invitation system UI
- [ ] Change history viewer with diff highlighting
- [ ] Collaborative commenting interface
- [ ] Conflict resolution UI for merge conflicts

### INTEGRATION REQUIREMENTS:
- [ ] WebSocket connection management with reconnection logic
- [ ] Y.js integration for operational transform
- [ ] Permission-based access controls in UI
- [ ] Mobile-optimized collaboration interface
- [ ] Integration with existing document editing workflows
- [ ] Proper TypeScript interfaces for all collaboration data

---

**EXECUTE IMMEDIATELY - Create a collaborative editing experience so smooth that teams prefer it over traditional document sharing!**

**🎯 SUCCESS METRIC**: Build a collaboration interface so intuitive that 90% of wedding planning documents become collaborative by default.