# TEAM B - ROUND 1: WS-243 - AI Chatbot Integration System
## 2025-01-20 - Development Round 1

**YOUR MISSION:** Build the backend API endpoints, OpenAI integration, and conversation management system
**FEATURE ID:** WS-243 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round  
**THINK ULTRA HARD** about AI response quality, conversation context, and scalable architecture

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/app/api/chatbot/
cat $WS_ROOT/wedsync/src/app/api/chatbot/conversations/route.ts | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test chatbot-api
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

// Query existing API patterns and OpenAI usage
await mcp__serena__search_for_pattern("api/route|openai|gpt");
await mcp__serena__find_symbol("withSecureValidation", "", true);
await mcp__serena__get_symbols_overview("src/app/api");
```

### B. UI STYLE GUIDES & TECHNOLOGY STACK (MANDATORY FOR ALL UI WORK)
```typescript
// CRITICAL: Load the correct UI Style Guide for any admin interfaces
await mcp__serena__read_file("$WS_ROOT/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");
```

**🚨 CRITICAL BACKEND TECHNOLOGY STACK:**
- **Next.js 15 API Routes**: App Router architecture
- **Supabase**: PostgreSQL database and real-time subscriptions
- **OpenAI GPT-4**: AI conversation engine
- **Zod**: Input validation and schema definition
- **TypeScript 5.9.2**: Strict mode, no 'any' types

### C. REF MCP CURRENT DOCS (MINUTES 3-5)
```typescript
// Load documentation SPECIFIC to OpenAI and conversational AI
# Use Ref MCP to search for OpenAI API, conversation management, and rate limiting patterns
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR COMPLEX FEATURE PLANNING

### Use Sequential Thinking MCP for Complex Analysis
```typescript
mcp__sequential-thinking__sequential_thinking({
  thought: "I need to architect a robust AI chatbot backend. Key considerations: 1) OpenAI API integration with proper error handling 2) Conversation context management and memory 3) Wedding industry knowledge injection 4) Rate limiting per user/organization 5) Conversation persistence and retrieval 6) Real-time message delivery 7) Escalation to human support workflow. The system needs to handle high concurrency while maintaining conversation quality.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 6
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

Launch these agents with comprehensive requirements:

1. **task-tracker-coordinator** - Break down API endpoints and database operations
2. **nextjs-fullstack-developer** - Ensure proper App Router API patterns  
3. **security-compliance-officer** - Implement comprehensive input validation and rate limiting
4. **supabase-specialist** - Design conversation storage and real-time subscriptions
5. **test-automation-architect** - Create API integration tests
6. **documentation-chronicler** - Document AI integration patterns and configuration

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### API ROUTE SECURITY CHECKLIST:
- [ ] **Zod validation on EVERY input** - Use withSecureValidation middleware
- [ ] **Authentication check** - getServerSession() for all chatbot routes
- [ ] **Rate limiting applied** - rateLimitService.checkRateLimit() per user/org
- [ ] **SQL injection prevention** - secureStringSchema for all text inputs
- [ ] **XSS prevention** - Sanitize all AI responses before storage
- [ ] **CSRF protection** - Automatic with Next.js App Router
- [ ] **Error messages sanitized** - Never leak OpenAI API errors or system details
- [ ] **Audit logging** - Log all AI interactions with user context
- [ ] **API key security** - OpenAI API key properly configured in environment

## 🎯 TEAM B SPECIALIZATION: BACKEND/API FOCUS

**BACKEND/API FOCUS:**
- Next.js 15 API endpoints with TypeScript
- Database operations and migrations (Supabase)
- withSecureValidation middleware required for all routes
- Authentication and comprehensive rate limiting
- Error handling and structured logging
- Business logic implementation with wedding context

## 📋 TECHNICAL SPECIFICATION FROM WS-243

**Core Backend Requirements:**
- OpenAI GPT-4 integration with conversation context
- Conversation management with persistent memory
- Real-time message delivery via WebSockets/Server-Sent Events
- Wedding industry knowledge injection into prompts
- User authentication and organization-based access control
- Rate limiting per user and organization
- Conversation analytics and performance monitoring
- Escalation workflow to human support

**Database Schema (from spec):**
- chatbot_conversations - Session and context management
- chatbot_messages - Individual message storage with AI metadata
- chatbot_prompts - System prompts and wedding context templates
- chatbot_analytics - Performance and satisfaction metrics

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1

### PRIMARY API ENDPOINTS:

1. **Conversation Management (`/api/chatbot/conversations/route.ts`)**
   ```typescript
   // POST - Create new conversation
   // GET - Get conversation history
   // PUT - Update conversation context
   ```

2. **Message Processing (`/api/chatbot/conversations/[conversationId]/messages/route.ts`)**
   ```typescript
   // POST - Send message to AI and get response
   // GET - Retrieve message history
   ```

3. **OpenAI Integration (`/lib/services/chatbot-ai-service.ts`)**
   ```typescript
   class ChatbotAIService {
     async processMessage(
       message: string,
       conversationHistory: Message[],
       userContext: UserContext
     ): Promise<AIResponse>
   }
   ```

4. **Conversation Context (`/lib/services/conversation-context-service.ts`)**
   ```typescript
   class ConversationContextService {
     async buildWeddingContext(
       userId: string,
       currentPage: string
     ): Promise<WeddingContext>
   }
   ```

### DATABASE OPERATIONS:

1. **Migration File**: `supabase/migrations/[timestamp]_chatbot_system.sql`
   - Create all chatbot tables from WS-243 specification
   - Set up RLS policies for conversation privacy
   - Create indexes for performance optimization

2. **Database Service**: `/lib/database/chatbot-database-service.ts`
   - CRUD operations for conversations and messages
   - Context retrieval and storage
   - Analytics data collection

### OPENAI INTEGRATION:

1. **Wedding Industry Context Injection**:
   ```typescript
   const weddingSystemPrompt = `You are a helpful AI assistant specialized in wedding planning and supplier coordination. 
   You understand wedding terminology, vendor relationships, and common planning challenges...`;
   ```

2. **Conversation Memory Management**:
   - Maintain conversation context across messages
   - Inject relevant user/organization data
   - Handle context window limitations

3. **Response Processing**:
   - Content filtering and validation
   - Response time optimization
   - Error handling and fallback responses

### REAL-TIME FEATURES:

1. **WebSocket/SSE Integration**:
   - Real-time message delivery
   - Typing indicators during AI processing  
   - Connection management and recovery

2. **Rate Limiting Implementation**:
   ```typescript
   // Per-user rate limits
   const userLimit = await rateLimitService.checkRateLimit(
     `chatbot:user:${userId}`,
     { windowMs: 60000, max: 20 }
   );
   
   // Per-organization limits
   const orgLimit = await rateLimitService.checkRateLimit(
     `chatbot:org:${organizationId}`,
     { windowMs: 60000, max: 100 }
   );
   ```

## 💾 WHERE TO SAVE YOUR WORK

**API Routes:**
- `$WS_ROOT/wedsync/src/app/api/chatbot/` - All chatbot API endpoints
- `$WS_ROOT/wedsync/src/lib/services/chatbot-ai-service.ts` - OpenAI integration
- `$WS_ROOT/wedsync/src/lib/database/chatbot-database-service.ts` - Database operations

**Database:**
- `$WS_ROOT/wedsync/supabase/migrations/` - Database schema migrations
- `$WS_ROOT/wedsync/src/types/chatbot.ts` - TypeScript interfaces

**Tests:**
- `$WS_ROOT/wedsync/tests/api/chatbot/` - API endpoint tests
- `$WS_ROOT/wedsync/tests/services/chatbot-ai-service.test.ts` - AI service tests

**Reports:**
- `$WS_ROOT/WORKFLOW-V2-DRAFT/INBOX/senior-dev/WS-243-team-b-round-1-complete.md`

## 🏁 COMPLETION CHECKLIST

### EVIDENCE REQUIREMENTS:
- [ ] All API route files created and verified to exist
- [ ] Database migration applied successfully
- [ ] TypeScript compilation successful (npm run typecheck)
- [ ] All API tests passing (npm test chatbot-api)
- [ ] OpenAI integration tested with real API calls
- [ ] Rate limiting verified through load testing

### FUNCTIONALITY REQUIREMENTS:
- [ ] Conversation creation and management working
- [ ] Message processing with AI responses
- [ ] Wedding industry context properly injected
- [ ] Real-time message delivery implemented
- [ ] User authentication and authorization working
- [ ] Error handling and graceful degradation

### SECURITY REQUIREMENTS:
- [ ] All inputs validated with Zod schemas
- [ ] Rate limiting enforced per user/organization
- [ ] Conversation privacy protected with RLS
- [ ] OpenAI API key secured and not exposed
- [ ] Comprehensive audit logging implemented
- [ ] Input sanitization and XSS prevention

### DATABASE REQUIREMENTS:
- [ ] All chatbot tables created with proper schema
- [ ] RLS policies configured for data privacy
- [ ] Database indexes added for query performance
- [ ] Migration successfully applied to staging/production
- [ ] Conversation and message CRUD operations working

---

**EXECUTE IMMEDIATELY - Build a production-ready AI chatbot backend that can handle wedding industry conversations at scale!**

**🎯 SUCCESS METRIC**: Create an AI backend so responsive and intelligent that it resolves 70% of user queries without human intervention.