# TEAM B - ROUND 1: WS-321 - Guest Management Section Overview
## 2025-01-25 - Development Round 1

**YOUR MISSION:** Build comprehensive backend APIs and database systems for wedding guest management with RSVP tracking and seating coordination
**FEATURE ID:** WS-321 (Track all work with this ID)  
**TIME LIMIT:** 2-3 hours per round
**THINK ULTRA HARD** about managing 150+ wedding guests with complex relationships, dietary requirements, and real-time RSVP synchronization

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/app/api/guest-management/
cat $WS_ROOT/wedsync/src/app/api/guest-management/guests/route.ts | head -20
```

2. **DATABASE MIGRATION RESULTS:**
```bash
npx supabase migration list --linked
# MUST show WS-321 guest management migration applied
```

3. **API VALIDATION TEST:**
```bash
curl -X POST "http://localhost:3000/api/guest-management/guests" -H "Content-Type: application/json" -d '{"firstName": "John", "lastName": "Doe", "email": "john@example.com"}'
# MUST return success with validation
```

## 🎯 TEAM B SPECIALIZATION: BACKEND/API FOCUS

**BACKEND/API REQUIREMENTS:**
- API endpoints with withSecureValidation middleware for guest data
- Database schema for guest management with proper relationships
- Real-time RSVP notification system for status changes
- Guest invitation and communication management
- Seating arrangement optimization and conflict detection
- Dietary requirements tracking and catering integration
- Guest data import/export with CSV processing
- Performance optimization for large guest lists (150+ guests)

## 📚 STEP 1: ENHANCED DOCUMENTATION & CODEBASE ANALYSIS

### A. SERENA PROJECT ACTIVATION
```typescript
await mcp__serena__activate_project("$WS_ROOT/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);

// Query existing guest management and RSVP patterns
await mcp__serena__search_for_pattern("guest.*management|rsvp|invitation|seating");
await mcp__serena__find_symbol("GuestAPI", "", true);
await mcp__serena__get_symbols_overview("src/app/api");
```

### B. REF MCP CURRENT DOCS
```typescript
ref_search_documentation("Next.js 15 API routes guest management Zod validation");
ref_search_documentation("Supabase real-time subscriptions RSVP notifications");
ref_search_documentation("PostgreSQL guest database schema wedding relationships");
```

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### API ROUTE SECURITY CHECKLIST:
- [ ] **Zod validation on EVERY input** - Use withSecureValidation middleware
- [ ] **Guest data privacy** - Protect sensitive guest information
- [ ] **Couple authorization** - Verify couple ownership of guest data
- [ ] **Vendor access controls** - Limit vendor access to relevant guest info only
- [ ] **Change audit logging** - Log all guest data modifications
- [ ] **Rate limiting applied** - Prevent guest data abuse (50 req/min)
- [ ] **Input sanitization** - Clean all guest information inputs
- [ ] **GDPR compliance** - Handle guest data with privacy protection

## 🗄️ DATABASE SCHEMA REQUIREMENTS

### REQUIRED TABLES (Create Migration):
```sql
-- Wedding guests core information
CREATE TABLE wedding_guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID REFERENCES clients(id),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  address TEXT,
  rsvp_status VARCHAR(20) DEFAULT 'pending' CHECK (rsvp_status IN ('pending', 'confirmed', 'declined', 'no_response')),
  rsvp_responded_at TIMESTAMPTZ,
  dietary_requirements JSONB DEFAULT '[]',
  plus_one_allowed BOOLEAN DEFAULT FALSE,
  plus_one_name VARCHAR(200),
  plus_one_dietary JSONB DEFAULT '[]',
  guest_group VARCHAR(100) DEFAULT 'general',
  relationship_to_couple TEXT,
  special_notes TEXT,
  accessibility_needs TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Guest seating assignments
CREATE TABLE guest_seating (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID REFERENCES clients(id),
  guest_id UUID REFERENCES wedding_guests(id),
  table_number INTEGER NOT NULL,
  seat_number INTEGER,
  table_type VARCHAR(50) DEFAULT 'round',
  seating_preferences JSONB DEFAULT '{}',
  conflicts JSONB DEFAULT '[]',
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Wedding tables configuration
CREATE TABLE wedding_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID REFERENCES clients(id),
  table_number INTEGER NOT NULL,
  table_name VARCHAR(100),
  table_type VARCHAR(50) DEFAULT 'round' CHECK (table_type IN ('round', 'rectangular', 'square')),
  capacity INTEGER NOT NULL DEFAULT 8,
  location_description TEXT,
  special_requirements TEXT,
  is_head_table BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Guest invitations and communications
CREATE TABLE guest_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id UUID REFERENCES wedding_guests(id),
  couple_id UUID REFERENCES clients(id),
  invitation_type VARCHAR(50) NOT NULL CHECK (invitation_type IN ('save_the_date', 'formal_invitation', 'rsvp_reminder', 'thank_you')),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  send_method VARCHAR(50) DEFAULT 'email' CHECK (send_method IN ('email', 'sms', 'postal', 'digital')),
  content TEXT,
  template_used VARCHAR(100),
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'delivered', 'opened', 'responded', 'bounced', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Guest RSVP responses and tracking
CREATE TABLE guest_rsvp_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id UUID REFERENCES wedding_guests(id),
  couple_id UUID REFERENCES clients(id),
  response_type VARCHAR(50) NOT NULL CHECK (response_type IN ('attending_ceremony', 'attending_reception', 'attending_both', 'not_attending')),
  guest_count INTEGER DEFAULT 1,
  plus_one_attending BOOLEAN DEFAULT FALSE,
  dietary_notes TEXT,
  song_requests JSONB DEFAULT '[]',
  special_requests TEXT,
  accommodation_needed BOOLEAN DEFAULT FALSE,
  transport_needed BOOLEAN DEFAULT FALSE,
  response_date TIMESTAMPTZ DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Guest change tracking and audit
CREATE TABLE guest_change_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id UUID REFERENCES wedding_guests(id),
  couple_id UUID REFERENCES clients(id),
  field_name VARCHAR(100) NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_by UUID REFERENCES auth.users(id),
  change_reason TEXT,
  change_type VARCHAR(50) DEFAULT 'update' CHECK (change_type IN ('create', 'update', 'delete', 'rsvp', 'seating')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 🚀 API ENDPOINTS TO BUILD

### 1. GUEST MANAGEMENT ENDPOINTS
```typescript
// GET /api/guest-management/guests
// Retrieve all guests for a couple with filtering
// POST /api/guest-management/guests
// Create new wedding guest with validation
// PUT /api/guest-management/guests/[id]
// Update guest information
// DELETE /api/guest-management/guests/[id]
// Remove guest (soft delete with audit trail)
```

### 2. RSVP MANAGEMENT ENDPOINTS
```typescript
// GET /api/guest-management/rsvp/status
// Get RSVP status overview and statistics
// PUT /api/guest-management/rsvp/[guestId]
// Update guest RSVP status
// POST /api/guest-management/rsvp/reminder
// Send RSVP reminders to pending guests
// GET /api/guest-management/rsvp/responses
// Get detailed RSVP responses and analytics
```

### 3. SEATING MANAGEMENT ENDPOINTS
```typescript
// GET /api/guest-management/seating/chart
// Retrieve complete seating arrangement
// POST /api/guest-management/seating/assign
// Assign guest to table and seat
// PUT /api/guest-management/seating/optimize
// Auto-optimize seating arrangement
// POST /api/guest-management/seating/conflicts
// Check and resolve seating conflicts
```

### 4. GUEST COMMUNICATION ENDPOINTS
```typescript
// POST /api/guest-management/invitations/send
// Send invitations to selected guests
// GET /api/guest-management/invitations/status
// Track invitation delivery and responses
// POST /api/guest-management/messages/bulk
// Send bulk messages to guest groups
// GET /api/guest-management/communications/history
// Get guest communication history
```

## 🔄 GUEST MANAGEMENT BUSINESS LOGIC

### Guest Management Service
```typescript
// Comprehensive guest management service
export class GuestManagementService {
  async createGuest(coupleId: string, guestData: CreateGuestData): Promise<Guest> {
    // 1. Validate guest information completeness
    // 2. Check for duplicate guests by email/name
    // 3. Assign guest to appropriate group/category
    // 4. Create audit log entry for guest creation
    // 5. Initialize RSVP tracking record
    // 6. Send welcome/invitation if requested
  }
  
  async updateRSVPStatus(guestId: string, status: RSVPStatus, responseData: RSVPResponse): Promise<void> {
    // 1. Update guest RSVP status and response details
    // 2. Record detailed response information
    // 3. Update guest count calculations for catering
    // 4. Notify couple of RSVP status change
    // 5. Update seating capacity calculations
    // 6. Trigger vendor notifications if needed
  }
  
  async bulkImportGuests(coupleId: string, csvData: string): Promise<ImportResult> {
    // 1. Parse CSV data and validate format
    // 2. Check for duplicate guests and conflicts
    // 3. Validate all required fields are present
    // 4. Create guests in batches for performance
    // 5. Generate import report with success/failures
    // 6. Send bulk invitations if requested
  }
}
```

### RSVP Tracking Service
```typescript
// Real-time RSVP tracking and analytics
export class RSVPTrackingService {
  async getRSVPStatistics(coupleId: string): Promise<RSVPStatistics> {
    // 1. Calculate confirmed, pending, declined counts
    // 2. Analyze dietary requirements distribution
    // 3. Track plus-one acceptance rates
    // 4. Calculate response timeline metrics
    // 5. Generate catering and venue capacity reports
  }
  
  async sendRSVPReminders(coupleId: string, guestIds: string[]): Promise<ReminderResult> {
    // 1. Filter guests who haven't responded
    // 2. Check reminder frequency limits
    // 3. Personalize reminder messages
    // 4. Send via preferred communication method
    // 5. Track reminder delivery status
    // 6. Schedule follow-up reminders if needed
  }
}
```

### Seating Management Service
```typescript
// Intelligent seating arrangement service
export class SeatingManagementService {
  async optimizeSeatingArrangement(coupleId: string): Promise<SeatingOptimization> {
    // 1. Analyze guest relationships and preferences
    // 2. Consider dietary requirements and accessibility
    // 3. Balance table sizes and guest groups
    // 4. Minimize conflicts and maximize harmony
    // 5. Generate multiple seating options
    // 6. Provide optimization reasoning and suggestions
  }
  
  async detectSeatingConflicts(coupleId: string): Promise<SeatingConflict[]> {
    // 1. Check for relationship conflicts between guests
    // 2. Validate table capacity constraints
    // 3. Identify accessibility requirement conflicts
    // 4. Check dietary requirement grouping issues
    // 5. Suggest conflict resolution options
  }
}
```

## ⚡ PERFORMANCE OPTIMIZATION

### Guest Data Caching
```typescript
// Redis caching for guest management performance
export class GuestCacheService {
  async cacheGuestList(coupleId: string, guests: Guest[]): Promise<void> {
    // 1. Cache complete guest list (TTL: 30 minutes)
    // 2. Cache RSVP statistics (TTL: 15 minutes)
    // 3. Store seating arrangement (TTL: 1 hour)
    // 4. Cache dietary requirements summary (TTL: 45 minutes)
  }
  
  async invalidateGuestCache(coupleId: string, guestId?: string): Promise<void> {
    // 1. Clear specific guest cache when data changes
    // 2. Refresh RSVP statistics cache
    // 3. Update seating arrangement cache
    // 4. Trigger real-time updates for connected clients
  }
}
```

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1

### DATABASE & MIGRATIONS:
- [ ] Create WS-321 migration with all guest management tables
- [ ] Add performance indexes for guest queries and RSVP filtering
- [ ] Implement Row Level Security for guest data protection
- [ ] Create database triggers for automatic RSVP tracking

### API ENDPOINTS:
- [ ] Implement all 12 guest management API routes
- [ ] Add comprehensive Zod validation for all guest inputs
- [ ] Implement rate limiting (50 requests/minute per couple)
- [ ] Create real-time endpoints for RSVP status updates

### BUSINESS LOGIC:
- [ ] Build GuestManagementService with full CRUD operations
- [ ] Implement RSVPTrackingService with real-time analytics
- [ ] Create SeatingManagementService with optimization algorithms
- [ ] Build GuestCommunicationService for invitation management

### INTEGRATION FEATURES:
- [ ] CSV import/export functionality for guest lists
- [ ] Bulk invitation and communication system
- [ ] Real-time RSVP notification system
- [ ] Seating conflict detection and resolution

## 💾 WHERE TO SAVE YOUR WORK
- **API Routes:** $WS_ROOT/wedsync/src/app/api/guest-management/
- **Services:** $WS_ROOT/wedsync/src/lib/services/guest-management/
- **Database Migration:** $WS_ROOT/wedsync/supabase/migrations/
- **Validation:** $WS_ROOT/wedsync/src/lib/validation/guest-management.ts
- **Types:** $WS_ROOT/wedsync/src/types/guest-management.ts
- **Tests:** $WS_ROOT/wedsync/src/__tests__/api/guest-management/

## 🏁 COMPLETION CHECKLIST
- [ ] Database migration created and applied successfully
- [ ] All 12 API endpoints implemented with security validation
- [ ] Guest management service operational with CRUD operations
- [ ] RSVP tracking system functional with real-time updates
- [ ] Seating management system with optimization algorithms
- [ ] Guest communication system for invitations and reminders
- [ ] CSV import/export functionality operational
- [ ] Performance optimization with caching implemented
- [ ] Rate limiting and authentication enforced on all endpoints
- [ ] Comprehensive test suite passing (>90% coverage)
- [ ] Evidence package prepared with API documentation and guest statistics

---

**EXECUTE IMMEDIATELY - Build the guest management backbone that handles 150+ wedding guests with precision and real-time coordination!**