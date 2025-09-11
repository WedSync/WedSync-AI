# TEAM B - ROUND 1: WS-311 - Communications Section Overview  
## 2025-01-25 - Development Round 1

**YOUR MISSION:** Build comprehensive backend APIs and business logic for unified communications system with multi-channel messaging
**FEATURE ID:** WS-311 (Track all work with this ID)  
**TIME LIMIT:** 2-3 hours per round
**THINK ULTRA HARD** about message routing, delivery guarantees, and wedding-specific communication workflows

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/app/api/communications/
cat $WS_ROOT/wedsync/src/app/api/communications/send-message/route.ts | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **DATABASE MIGRATION RESULTS:**
```bash
npx supabase migration list --linked
# MUST show WS-311 communications migration applied
```

## 🎯 TEAM B SPECIALIZATION: BACKEND/API FOCUS

**BACKEND/API REQUIREMENTS:**
- API endpoints with withSecureValidation middleware required
- Database operations and migrations for communication data
- Authentication and rate limiting for all message endpoints
- Multi-channel message routing (email/SMS/WhatsApp)
- Message delivery tracking and status updates
- Template management with version control
- Bulk messaging with queue management
- Error handling and comprehensive logging

## 📚 STEP 1: ENHANCED DOCUMENTATION & CODEBASE ANALYSIS

### A. SERENA PROJECT ACTIVATION
```typescript
await mcp__serena__activate_project("$WS_ROOT/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);

// Query existing API patterns
await mcp__serena__search_for_pattern("api/.*route\\.ts|middleware|validation");
await mcp__serena__find_symbol("withSecureValidation", "", true);
await mcp__serena__get_symbols_overview("src/app/api");
```

### B. REF MCP CURRENT DOCS
```typescript
ref_search_documentation("Next.js 15 API routes authentication middleware security");
ref_search_documentation("Supabase database migrations tables communications messaging");
ref_search_documentation("Resend email API SMS WhatsApp integration Node.js");
```

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### API ROUTE SECURITY CHECKLIST:
- [ ] **Zod validation on EVERY input** - Use withSecureValidation middleware
- [ ] **Authentication check** - getServerSession() for ALL communication endpoints
- [ ] **Rate limiting applied** - Prevent spam/abuse (10 messages/minute per user)
- [ ] **SQL injection prevention** - Parameterized queries for all database operations
- [ ] **Message content validation** - Sanitize all templates and message content
- [ ] **Permission validation** - Verify user can message specific contacts
- [ ] **Audit logging** - Log all message operations with user context
- [ ] **Error messages sanitized** - Never leak internal system information

## 🗄️ DATABASE SCHEMA REQUIREMENTS

### REQUIRED TABLES (Create Migration):
```sql
-- Communication channels and templates
CREATE TABLE communication_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  channel_type TEXT NOT NULL CHECK (channel_type IN ('email', 'sms', 'whatsapp')),
  configuration JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Message templates
CREATE TABLE message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  channel_type TEXT NOT NULL,
  subject TEXT, -- For email templates
  content TEXT NOT NULL,
  variables JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Message history and tracking
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  client_id UUID REFERENCES clients(id),
  template_id UUID REFERENCES message_templates(id),
  channel_type TEXT NOT NULL,
  recipient_info JSONB NOT NULL, -- email, phone, etc.
  subject TEXT,
  content TEXT NOT NULL,
  status TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'sending', 'sent', 'delivered', 'failed')),
  external_id TEXT, -- Provider message ID
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Message delivery tracking
CREATE TABLE message_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES messages(id),
  event_type TEXT NOT NULL CHECK (event_type IN ('queued', 'sent', 'delivered', 'opened', 'clicked', 'failed', 'bounced')),
  event_data JSONB DEFAULT '{}',
  occurred_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 🚀 API ENDPOINTS TO BUILD

### 1. MESSAGE SENDING ENDPOINTS
```typescript
// POST /api/communications/send-message
// Send single message (email/SMS/WhatsApp)
// POST /api/communications/send-bulk
// Send bulk messages with queue management
// POST /api/communications/schedule-message  
// Schedule message for future delivery
```

### 2. TEMPLATE MANAGEMENT ENDPOINTS
```typescript
// GET /api/communications/templates
// List all templates with filtering
// POST /api/communications/templates
// Create new message template
// PUT /api/communications/templates/[id]
// Update existing template
// DELETE /api/communications/templates/[id]
// Delete template (soft delete)
```

### 3. MESSAGE HISTORY ENDPOINTS
```typescript
// GET /api/communications/messages
// Get message history with pagination
// GET /api/communications/messages/[id]
// Get specific message details and delivery status
// GET /api/communications/conversations/[clientId]
// Get full conversation history with client
```

### 4. CHANNEL CONFIGURATION ENDPOINTS  
```typescript
// GET /api/communications/channels
// Get communication channel settings
// PUT /api/communications/channels/[type]
// Update channel configuration (API keys, etc.)
```

## 🔄 MESSAGE ROUTING LOGIC

### Multi-Channel Routing System:
```typescript
// Core message routing service
export class MessageRouter {
  async routeMessage(message: MessageRequest): Promise<MessageResponse> {
    // 1. Validate message content and recipient
    // 2. Select appropriate channel (email/SMS/WhatsApp)
    // 3. Apply rate limiting and permissions
    // 4. Queue message for delivery
    // 5. Track delivery status
    // 6. Handle failures and retries
  }
}
```

## 🏗️ BUSINESS LOGIC REQUIREMENTS

### Core Services to Implement:
- **MessageService** - Message creation, validation, and routing
- **TemplateService** - Template management with variable substitution  
- **DeliveryService** - Multi-channel message delivery coordination
- **QueueService** - Bulk message processing and rate limiting
- **TrackingService** - Delivery status monitoring and webhook handling
- **NotificationService** - Real-time status updates to frontend

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1

### DATABASE & MIGRATIONS:
- [ ] Create WS-311 migration with all communication tables
- [ ] Add proper indexes for performance (organization_id, client_id, status)
- [ ] Implement Row Level Security policies for communication data
- [ ] Create database functions for message statistics and reporting

### API ENDPOINTS:
- [ ] Implement all 8 core communication API routes
- [ ] Add comprehensive Zod validation schemas
- [ ] Implement rate limiting (10 messages/minute per user)
- [ ] Add authentication checks on all endpoints
- [ ] Create webhook endpoints for delivery status updates

### BUSINESS LOGIC:
- [ ] Build MessageRouter with multi-channel support
- [ ] Implement template variable substitution system
- [ ] Create bulk message processing with progress tracking
- [ ] Add message scheduling with cron job integration
- [ ] Build delivery tracking with external provider webhooks

### INTEGRATION:
- [ ] Integrate Resend for email delivery
- [ ] Add SMS provider integration (Twilio/similar)
- [ ] WhatsApp Business API integration setup
- [ ] Calendar scheduling integration (Google Calendar/Outlook)

## 💾 WHERE TO SAVE YOUR WORK
- **API Routes:** $WS_ROOT/wedsync/src/app/api/communications/
- **Services:** $WS_ROOT/wedsync/src/lib/services/communications/
- **Database Migration:** $WS_ROOT/wedsync/supabase/migrations/
- **Types:** $WS_ROOT/wedsync/src/types/communications.ts
- **Tests:** $WS_ROOT/wedsync/src/__tests__/api/communications/

## 🏁 COMPLETION CHECKLIST
- [ ] Database migration created and applied successfully
- [ ] All 8 API endpoints implemented with security validation
- [ ] Multi-channel message routing functional
- [ ] Template management system operational
- [ ] Message queue and bulk processing working
- [ ] Delivery tracking and status updates functional
- [ ] Rate limiting and authentication enforced
- [ ] Comprehensive test suite passing (>90% coverage)
- [ ] Integration with external providers successful
- [ ] Evidence package prepared with API documentation

---

**EXECUTE IMMEDIATELY - Build the robust communication backend that handles thousands of wedding messages reliably!**