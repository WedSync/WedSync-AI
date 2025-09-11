# TEAM B - ROUND 1: WS-244 - Real-Time Collaboration System
## 2025-01-20 - Development Round 1

**YOUR MISSION:** Build the backend WebSocket infrastructure, Y.js document synchronization, and collaborative session management
**FEATURE ID:** WS-244 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round  
**THINK ULTRA HARD** about real-time data synchronization, conflict resolution, and scalable WebSocket architecture

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/app/api/collaboration/
cat $WS_ROOT/wedsync/src/app/api/collaboration/sessions/route.ts | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test collaboration-api
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

// Query existing real-time and WebSocket patterns
await mcp__serena__search_for_pattern("websocket|realtime|sse|socket");
await mcp__serena__find_symbol("WebSocketHandler", "", true);
await mcp__serena__get_symbols_overview("src/lib/realtime");
```

### B. UI STYLE GUIDES & TECHNOLOGY STACK (MANDATORY FOR ANY UI WORK)
```typescript
// Load the correct UI Style Guide for admin interfaces
await mcp__serena__read_file("$WS_ROOT/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");
```

**🚨 CRITICAL BACKEND TECHNOLOGY STACK:**
- **Next.js 15 API Routes**: App Router with WebSocket support
- **Y.js**: Conflict-free replicated data types (CRDTs)
- **WebSocket API**: Real-time bidirectional communication
- **Supabase Realtime**: Alternative real-time channel
- **PostgreSQL**: Document and session persistence
- **TypeScript 5.9.2**: Strict mode, no 'any' types

### C. REF MCP CURRENT DOCS (MINUTES 3-5)
```typescript
// Load documentation SPECIFIC to Y.js and real-time collaboration
# Use Ref MCP to search for Y.js documentation, operational transform, WebSocket patterns, and collaborative editing
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR REAL-TIME ARCHITECTURE

### Use Sequential Thinking MCP for Complex Analysis
```typescript
mcp__sequential-thinking__sequential_thinking({
  thought: "I need to architect a robust real-time collaboration backend. Key considerations: 1) Y.js document synchronization with conflict-free merging 2) WebSocket server for real-time communication 3) Session management with user presence tracking 4) Document persistence to PostgreSQL 5) Operational Transform for concurrent edits 6) Connection recovery and offline sync 7) Rate limiting per collaboration session 8) Scalable architecture for 100+ concurrent collaborators per document. The system needs Y.js provider running on server with WebSocket transport.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 6
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

Launch these agents with comprehensive requirements:

1. **task-tracker-coordinator** - Break down WebSocket endpoints and Y.js integration
2. **nextjs-fullstack-developer** - Ensure proper App Router WebSocket patterns
3. **security-compliance-officer** - Implement secure real-time connections
4. **supabase-specialist** - Design collaboration session storage
5. **test-automation-architect** - Create real-time API integration tests
6. **documentation-chronicler** - Document collaboration architecture

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### REAL-TIME API SECURITY CHECKLIST:
- [ ] **WebSocket authentication** - Verify user session on connection
- [ ] **Session authorization** - Check document access permissions
- [ ] **Rate limiting** - Limit operations per user per minute
- [ ] **Input validation** - Validate all Y.js operations before applying
- [ ] **Data encryption** - All WebSocket messages encrypted
- [ ] **Connection limits** - Maximum concurrent connections per user
- [ ] **Audit logging** - Log all collaboration events
- [ ] **DDoS protection** - WebSocket flood protection

## 🎯 TEAM B SPECIALIZATION: BACKEND/API FOCUS

**BACKEND/API FOCUS:**
- Next.js 15 API endpoints with WebSocket support
- Y.js server-side document management
- Real-time session management and persistence
- withSecureValidation middleware for all routes
- Operational Transform conflict resolution
- WebSocket connection scaling and load balancing

## 📋 TECHNICAL SPECIFICATION FROM WS-244

**Core Backend Requirements:**
- Y.js document provider with WebSocket transport
- Collaborative session management with user presence
- Real-time operation broadcasting and synchronization
- Document persistence with versioning
- User permission enforcement in real-time
- Connection recovery and offline synchronization
- Performance monitoring for collaborative sessions

**Database Schema (from spec):**
- collaboration_sessions - Active collaboration sessions
- collaboration_participants - User participation tracking  
- document_operations - Y.js operation history
- collaboration_presence - Real-time user presence data

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1

### PRIMARY API ENDPOINTS:

1. **Session Management (`/api/collaboration/sessions/route.ts`)**
   ```typescript
   // POST - Create new collaboration session
   // GET - Get active sessions for user
   // PUT - Update session permissions
   // DELETE - End collaboration session
   ```

2. **WebSocket Handler (`/api/collaboration/websocket/route.ts`)**
   ```typescript
   // WebSocket connection management
   // Y.js operation broadcasting
   // Real-time presence updates
   // Connection recovery handling
   ```

3. **Y.js Document Provider (`/lib/services/yjs-document-service.ts`)**
   ```typescript
   class YjsDocumentService {
     async createDocument(
       sessionId: string,
       initialContent: any,
       permissions: CollaborationPermissions
     ): Promise<YjsDocument>

     async syncOperation(
       documentId: string,
       operation: YjsOperation,
       userId: string
     ): Promise<SyncResult>
   }
   ```

4. **Presence Management (`/lib/services/collaboration-presence-service.ts`)**
   ```typescript
   class CollaborationPresenceService {
     async updatePresence(
       sessionId: string,
       userId: string,
       presence: PresenceData
     ): Promise<void>

     async getSessionPresence(sessionId: string): Promise<PresenceData[]>
   }
   ```

### DATABASE OPERATIONS:

1. **Migration File**: `supabase/migrations/[timestamp]_collaboration_system.sql`
   - Create all collaboration tables from WS-244 specification
   - Set up RLS policies for session privacy
   - Create indexes for real-time query performance

2. **Database Service**: `/lib/database/collaboration-database-service.ts`
   - CRUD operations for sessions and participants
   - Document operation storage and retrieval
   - Presence data management with TTL

### Y.JS INTEGRATION:

1. **Server-Side Y.js Provider**:
   ```typescript
   class YjsWebSocketProvider {
     constructor(
       document: YjsDocument,
       sessionId: string,
       permissions: CollaborationPermissions
     )

     broadcastOperation(operation: YjsOperation): void
     handleClientConnection(websocket: WebSocket, userId: string): void
     syncDocumentState(): Promise<void>
   }
   ```

2. **Operational Transform Management**:
   - Real-time operation validation and transformation
   - Conflict resolution with automatic merge
   - Document state synchronization
   - History tracking for versioning

3. **WebSocket Message Protocol**:
   ```typescript
   interface CollaborationMessage {
     type: 'operation' | 'presence' | 'cursor' | 'selection';
     sessionId: string;
     userId: string;
     data: YjsOperation | PresenceData | CursorData;
     timestamp: number;
   }
   ```

### REAL-TIME FEATURES:

1. **Connection Management**:
   ```typescript
   class WebSocketConnectionManager {
     handleConnection(ws: WebSocket, sessionId: string, userId: string): void
     broadcastToSession(sessionId: string, message: CollaborationMessage): void
     handleDisconnection(userId: string, sessionId: string): void
   }
   ```

2. **Document Synchronization**:
   - Real-time Y.js document updates
   - State vector synchronization
   - Delta compression for efficient transport
   - Conflict-free merging with CRDTs

3. **Performance Optimization**:
   ```typescript
   // Rate limiting per session
   const sessionLimit = await rateLimitService.checkRateLimit(
     `collaboration:session:${sessionId}`,
     { windowMs: 60000, max: 1000 }
   );
   
   // Per-user operation limits
   const userLimit = await rateLimitService.checkRateLimit(
     `collaboration:user:${userId}`,
     { windowMs: 60000, max: 200 }
   );
   ```

## 💾 WHERE TO SAVE YOUR WORK

**API Routes:**
- `$WS_ROOT/wedsync/src/app/api/collaboration/` - All collaboration API endpoints
- `$WS_ROOT/wedsync/src/lib/services/yjs-document-service.ts` - Y.js integration
- `$WS_ROOT/wedsync/src/lib/database/collaboration-database-service.ts` - Database operations

**WebSocket Infrastructure:**
- `$WS_ROOT/wedsync/src/lib/websocket/collaboration-websocket-handler.ts` - WebSocket management
- `$WS_ROOT/wedsync/src/lib/realtime/yjs-provider.ts` - Y.js server provider

**Database:**
- `$WS_ROOT/wedsync/supabase/migrations/` - Database schema migrations
- `$WS_ROOT/wedsync/src/types/collaboration.ts` - TypeScript interfaces

**Tests:**
- `$WS_ROOT/wedsync/tests/api/collaboration/` - API endpoint tests
- `$WS_ROOT/wedsync/tests/services/yjs-document-service.test.ts` - Y.js service tests

**Reports:**
- `$WS_ROOT/WORKFLOW-V2-DRAFT/INBOX/senior-dev/WS-244-team-b-round-1-complete.md`

## 🏁 COMPLETION CHECKLIST

### EVIDENCE REQUIREMENTS:
- [ ] All API route files created and verified to exist
- [ ] Database migration applied successfully
- [ ] TypeScript compilation successful (npm run typecheck)
- [ ] All API tests passing (npm test collaboration-api)
- [ ] Y.js document synchronization tested with multiple clients
- [ ] WebSocket performance tested under load

### FUNCTIONALITY REQUIREMENTS:
- [ ] Collaboration session creation and management working
- [ ] Y.js document provider operational with conflict resolution
- [ ] Real-time presence tracking and updates
- [ ] WebSocket connection handling with proper cleanup
- [ ] Document persistence and version control
- [ ] User permission enforcement in real-time

### SECURITY REQUIREMENTS:
- [ ] All WebSocket connections authenticated
- [ ] Session permissions validated for each operation
- [ ] Rate limiting enforced per session/user
- [ ] Input validation for all Y.js operations
- [ ] Comprehensive audit logging for collaboration events
- [ ] Secure document access control

### DATABASE REQUIREMENTS:
- [ ] All collaboration tables created with proper schema
- [ ] RLS policies configured for session privacy
- [ ] Database indexes added for real-time query performance
- [ ] Migration successfully applied to staging/production
- [ ] Session and operation CRUD operations working

---

**EXECUTE IMMEDIATELY - Build a real-time collaboration backend so robust that multiple users can edit wedding documents simultaneously without conflicts!**

**🎯 SUCCESS METRIC**: Create a collaboration system so responsive that users feel like they're working on the same physical document.