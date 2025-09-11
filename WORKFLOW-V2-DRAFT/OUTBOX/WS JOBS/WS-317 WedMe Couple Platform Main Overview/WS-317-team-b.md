# TEAM B - ROUND 1: WS-317 - WedMe Couple Platform Main Overview
## 2025-01-22 - Development Round 1

**YOUR MISSION:** Build backend infrastructure for couple platform with vendor connections, shared timelines, and cross-platform data synchronization
**FEATURE ID:** WS-317 (Track all work with this ID)

## 🚨 EVIDENCE REQUIREMENTS
```bash
ls -la $WS_ROOT/wedsync/src/app/api/wedme/
npx supabase migration up --linked  # Migration successful
npm run typecheck  # No errors
npm test api/wedme  # All API tests passing
```

## 🎯 COUPLE PLATFORM BACKEND FOCUS
- **Couple Platform Infrastructure:** Database schema and API endpoints for unified couple experience
- **Vendor Connection System:** Secure vendor invitation, permission management, and data sharing
- **Cross-Vendor Timeline Sync:** Real-time synchronization of vendor timelines and milestones
- **Multi-Vendor Communication:** Message routing, broadcast capabilities, and conversation management
- **Shared Data Management:** Guest lists, wedding details, and document sharing across vendors
- **Wedding Website API:** Backend support for couple website generation with vendor data

## 📊 DATABASE SCHEMA
```sql
-- WS-317 WedMe Couple Platform Schema
CREATE TABLE couple_platforms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES clients(id),
  platform_slug VARCHAR(100) UNIQUE NOT NULL,
  wedding_date DATE NOT NULL,
  venue_name VARCHAR(255),
  guest_count INTEGER,
  wedding_style VARCHAR(100),
  platform_settings JSONB DEFAULT '{}',
  privacy_settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE vendor_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_platform_id UUID NOT NULL REFERENCES couple_platforms(id),
  supplier_id UUID NOT NULL REFERENCES user_profiles(id),
  service_type VARCHAR(100) NOT NULL,
  connection_status VARCHAR(50) DEFAULT 'pending', -- pending, connected, declined, disconnected
  permissions JSONB DEFAULT '{}', -- guest_list, timeline, documents, communication
  invitation_token VARCHAR(255) UNIQUE,
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  connected_at TIMESTAMPTZ,
  disconnected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE shared_wedding_timelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_platform_id UUID NOT NULL REFERENCES couple_platforms(id),
  vendor_connection_id UUID REFERENCES vendor_connections(id),
  milestone_id UUID,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  due_date DATE,
  vendor_responsible UUID REFERENCES user_profiles(id),
  couple_action_required BOOLEAN DEFAULT FALSE,
  status VARCHAR(50) DEFAULT 'pending', -- pending, in_progress, completed, overdue
  dependencies JSONB DEFAULT '[]',
  priority VARCHAR(20) DEFAULT 'normal',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE couple_vendor_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_platform_id UUID NOT NULL REFERENCES couple_platforms(id),
  vendor_connection_id UUID REFERENCES vendor_connections(id),
  conversation_type VARCHAR(50) DEFAULT 'direct', -- direct, broadcast, group
  subject VARCHAR(255),
  participants JSONB NOT NULL, -- Array of participant IDs
  is_active BOOLEAN DEFAULT TRUE,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE couple_vendor_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES couple_vendor_conversations(id),
  sender_id UUID NOT NULL,
  sender_type VARCHAR(20) NOT NULL, -- couple, vendor
  message_content TEXT NOT NULL,
  message_type VARCHAR(50) DEFAULT 'text', -- text, image, document, timeline_update
  attachments JSONB DEFAULT '[]',
  read_by JSONB DEFAULT '{}', -- Tracks read status per participant
  is_priority BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE shared_guest_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_platform_id UUID NOT NULL REFERENCES couple_platforms(id),
  vendor_connection_id UUID NOT NULL REFERENCES vendor_connections(id),
  guest_data_access JSONB NOT NULL, -- Specific guest data fields accessible
  access_level VARCHAR(50) DEFAULT 'read_only', -- read_only, read_write
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

CREATE TABLE wedding_website_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_platform_id UUID NOT NULL REFERENCES couple_platforms(id),
  website_slug VARCHAR(100) UNIQUE NOT NULL,
  template_id VARCHAR(100),
  website_data JSONB NOT NULL,
  vendor_showcase JSONB DEFAULT '{}',
  is_published BOOLEAN DEFAULT FALSE,
  custom_domain VARCHAR(255),
  seo_settings JSONB DEFAULT '{}',
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_couple_platforms_slug ON couple_platforms(platform_slug);
CREATE INDEX idx_vendor_connections_couple ON vendor_connections(couple_platform_id, connection_status);
CREATE INDEX idx_shared_timelines_couple ON shared_wedding_timelines(couple_platform_id, due_date);
CREATE INDEX idx_conversations_couple ON couple_vendor_conversations(couple_platform_id, last_message_at DESC);
CREATE INDEX idx_messages_conversation ON couple_vendor_messages(conversation_id, created_at DESC);
CREATE INDEX idx_website_data_slug ON wedding_website_data(website_slug);

-- Full-text search for messages
CREATE INDEX idx_messages_search ON couple_vendor_messages USING GIN(to_tsvector('english', message_content));
```

## 🎯 API ENDPOINTS STRUCTURE
- `GET/POST/PUT /api/wedme/platforms` - Couple platform management
- `GET/POST/PUT/DELETE /api/wedme/vendors` - Vendor connection management
- `POST /api/wedme/vendors/invite` - Vendor invitation system
- `GET/PUT /api/wedme/timeline` - Shared timeline management
- `GET/POST /api/wedme/conversations` - Multi-vendor communication
- `POST /api/wedme/messages` - Message sending and broadcast
- `GET/PUT /api/wedme/guest-access` - Guest data sharing management
- `GET/POST/PUT /api/wedme/website` - Wedding website management
- `POST /api/wedme/notifications` - Real-time notification system

## 🛡️ CRITICAL SECURITY REQUIREMENTS

### Multi-Vendor Access Control
- [ ] withSecureValidation on all WedMe endpoints
- [ ] Granular permission system for vendor data access
- [ ] Secure vendor invitation tokens with expiration
- [ ] Couple consent required for all vendor connections
- [ ] Audit logging for all vendor data access and modifications

### Data Privacy & Couple Protection
- [ ] End-to-end encryption for sensitive couple communications
- [ ] GDPR compliance for guest data sharing with vendors
- [ ] Consent management for vendor access to personal information
- [ ] Right to disconnect vendors and revoke all access
- [ ] Secure deletion of couple data upon request

### Wedding Data Security
- [ ] Secure storage of wedding planning documents and photos
- [ ] Protection against unauthorized vendor data access
- [ ] Secure backup and recovery for irreplaceable wedding data
- [ ] Vendor data segregation to prevent cross-contamination
- [ ] Wedding day emergency access procedures

## 💾 REQUIRED FILES TO CREATE
```
$WS_ROOT/wedsync/src/app/api/wedme/
├── platforms/
│   ├── route.ts                     # Couple platform CRUD
│   └── [platformId]/route.ts        # Specific platform operations
├── vendors/
│   ├── route.ts                     # Vendor connection management
│   ├── invite/route.ts              # Vendor invitation system
│   ├── permissions/route.ts         # Vendor access control
│   └── disconnect/route.ts          # Vendor disconnection
├── timeline/
│   ├── route.ts                     # Shared timeline operations
│   ├── sync/route.ts                # Timeline synchronization
│   └── milestones/route.ts          # Milestone management
├── conversations/
│   ├── route.ts                     # Conversation management
│   ├── [conversationId]/route.ts    # Specific conversation operations
│   └── broadcast/route.ts           # Broadcast messaging
├── messages/
│   ├── route.ts                     # Message sending and retrieval
│   ├── read/route.ts                # Message read status
│   └── search/route.ts              # Message search functionality
├── guest-access/
│   ├── route.ts                     # Guest data sharing
│   └── permissions/route.ts         # Access level management
├── website/
│   ├── route.ts                     # Website data management
│   ├── publish/route.ts             # Website publishing
│   └── preview/route.ts             # Website preview generation
└── notifications/
    ├── route.ts                     # Notification management
    └── realtime/route.ts            # Real-time updates

$WS_ROOT/wedsync/src/lib/wedme/
├── platformManager.ts               # Couple platform logic
├── vendorConnectionService.ts       # Vendor relationship management
├── timelineSynchronizer.ts          # Cross-vendor timeline sync
├── conversationManager.ts           # Multi-vendor communication
├── guestDataManager.ts              # Shared guest list management
├── websiteGenerator.ts              # Wedding website creation
├── notificationEngine.ts            # Real-time notification system
└── __tests__/
    ├── platformManager.test.ts
    ├── vendorConnectionService.test.ts
    ├── timelineSynchronizer.test.ts
    └── conversationManager.test.ts

$WS_ROOT/wedsync/supabase/migrations/
└── 62_wedme_couple_platform.sql     # Database migration
```

## 🔧 IMPLEMENTATION DETAILS

### Vendor Connection Management
```typescript
export class VendorConnectionService {
  async inviteVendor(
    couplePlatformId: string,
    vendorInvite: VendorInviteRequest
  ): Promise<VendorInvitation> {
    // Generate secure invitation token
    // Create vendor connection record with 'pending' status
    // Send invitation email with platform access link
    // Set up permission defaults based on service type
    // Create audit log for invitation
    
    const invitationToken = await this.generateSecureToken();
    const connection = await this.createVendorConnection({
      couplePlatformId,
      serviceType: vendorInvite.serviceType,
      permissions: this.getDefaultPermissions(vendorInvite.serviceType),
      invitationToken
    });
    
    await this.sendVendorInvitationEmail(vendorInvite.email, invitationToken, connection);
    return connection;
  }

  async acceptVendorInvitation(
    invitationToken: string,
    supplierId: string
  ): Promise<VendorConnection> {
    // Validate invitation token and expiry
    // Update connection status to 'connected'
    // Grant vendor access to couple platform
    // Initialize vendor-specific timeline sync
    // Notify couple of successful connection
  }
}
```

### Timeline Synchronization Engine
```typescript
export class TimelineSynchronizer {
  async syncVendorTimeline(
    vendorConnectionId: string,
    vendorTimeline: VendorTimeline[]
  ): Promise<void> {
    // Validate vendor permissions for timeline updates
    // Merge vendor timeline with shared couple timeline
    // Resolve timeline conflicts and dependencies
    // Update shared timeline with vendor milestones
    // Notify couple of timeline changes
    
    for (const milestone of vendorTimeline) {
      await this.mergeTimelineMilestone({
        vendorConnectionId,
        milestone,
        conflictResolution: 'vendor_priority' // or 'couple_approval'
      });
    }
    
    await this.notifyTimelineUpdates(vendorConnectionId);
  }

  async updateSharedTimeline(
    couplePlatformId: string,
    updates: TimelineUpdate[]
  ): Promise<void> {
    // Apply timeline updates with proper validation
    // Check vendor dependencies and conflicts
    // Propagate changes to all connected vendors
    // Generate notifications for affected parties
  }
}
```

### Multi-Vendor Communication System
```typescript
export class ConversationManager {
  async createVendorConversation(
    couplePlatformId: string,
    participants: ConversationParticipant[],
    type: ConversationType
  ): Promise<Conversation> {
    // Validate participant permissions
    // Create conversation with proper access controls
    // Set up real-time message routing
    // Initialize conversation metadata
    
    const conversation = await this.createConversation({
      couplePlatformId,
      participants,
      type,
      permissions: await this.calculateConversationPermissions(participants)
    });
    
    await this.setupRealtimeChannels(conversation.id, participants);
    return conversation;
  }

  async broadcastMessage(
    couplePlatformId: string,
    message: BroadcastMessage,
    vendorTargets: string[]
  ): Promise<void> {
    // Create individual conversations for each vendor
    // Send message to all target vendors
    // Track delivery and read status
    // Handle vendor response routing
    
    const broadcastConversations = await Promise.all(
      vendorTargets.map(vendorId => 
        this.createOrGetConversation(couplePlatformId, vendorId)
      )
    );
    
    await this.sendMessageToConversations(broadcastConversations, message);
  }
}
```

### Shared Data Management
```typescript
export class GuestDataManager {
  async shareGuestDataWithVendor(
    couplePlatformId: string,
    vendorConnectionId: string,
    accessConfig: GuestAccessConfig
  ): Promise<void> {
    // Validate vendor permissions for guest data access
    // Apply data filtering based on access level
    // Create secure guest data view for vendor
    // Set up automatic sync for guest list updates
    // Log data sharing activity for audit
    
    const filteredGuestData = await this.filterGuestData(
      couplePlatformId,
      accessConfig.accessLevel,
      accessConfig.dataFields
    );
    
    await this.grantVendorAccess(vendorConnectionId, filteredGuestData, accessConfig);
  }

  async syncGuestUpdates(
    couplePlatformId: string,
    guestUpdates: GuestUpdate[]
  ): Promise<void> {
    // Apply guest list updates
    // Identify vendors requiring update notifications
    // Propagate relevant changes to connected vendors
    // Respect vendor-specific access permissions
  }
}
```

### Wedding Website Integration
```typescript
export class WeddingWebsiteGenerator {
  async generateCoupleWebsite(
    couplePlatformId: string,
    template: WebsiteTemplate,
    vendorShowcase: boolean = true
  ): Promise<WeddingWebsite> {
    // Aggregate couple and vendor data for website
    // Apply selected template with couple customizations
    // Include vendor showcase if permitted and requested
    // Generate SEO-optimized pages with wedding details
    // Set up custom domain if provided
    
    const weddingData = await this.aggregateWeddingData(couplePlatformId);
    const vendorData = vendorShowcase ? 
      await this.getVendorShowcaseData(couplePlatformId) : null;
    
    const website = await this.buildWebsite({
      template,
      weddingData,
      vendorData,
      seoSettings: await this.generateSEOSettings(weddingData)
    });
    
    return website;
  }
}
```

## 🚀 REAL-TIME SYNCHRONIZATION

### WebSocket Integration
```typescript
export class WedMeRealtimeService {
  async setupCouplePlatformChannels(couplePlatformId: string): Promise<void> {
    // Set up real-time channels for couple platform
    // Configure vendor connection status updates
    // Enable timeline change notifications
    // Set up message delivery confirmation
    
    const channels = [
      `couple-platform:${couplePlatformId}`,
      `vendor-connections:${couplePlatformId}`,
      `timeline-updates:${couplePlatformId}`,
      `messages:${couplePlatformId}`
    ];
    
    await this.supabase.channel('wedme-realtime')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'vendor_connections' 
      }, this.handleVendorConnectionChange)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'shared_wedding_timelines'
      }, this.handleTimelineChange)
      .subscribe();
  }
}
```

## 🎯 ACCEPTANCE CRITERIA

### API Functionality
- [ ] All WedMe endpoints respond within 500ms (95th percentile)
- [ ] Vendor connection workflow completes without data loss
- [ ] Timeline synchronization maintains accuracy across vendors
- [ ] Multi-vendor messaging delivers within 2 seconds
- [ ] Guest data sharing respects permission boundaries
- [ ] Wedding website generation completes within 10 seconds

### Data Integrity & Consistency
- [ ] Vendor permissions enforce correctly across all data access
- [ ] Timeline conflicts resolve according to business rules
- [ ] Message delivery maintains order and prevents duplicates
- [ ] Guest data synchronization preserves data accuracy
- [ ] Vendor disconnection properly revokes all access

### Security & Privacy Compliance
- [ ] All vendor connections require proper authentication
- [ ] Couple data remains private unless explicitly shared
- [ ] Vendor invitation tokens expire appropriately
- [ ] Guest data access logs maintain complete audit trail
- [ ] GDPR compliance verified for international couples

## 📊 WEDDING INDUSTRY SPECIFIC FEATURES

### Wedding Timeline Coordination
- Cross-vendor dependency management for wedding day coordination
- Seasonal wedding timeline adjustments and vendor coordination
- Emergency contact system for wedding day vendor issues
- Post-wedding vendor review and rating system integration

### Vendor Collaboration Features
- Shared vendor resources for collaborative wedding services
- Vendor referral tracking and commission management
- Multi-vendor package coordination and pricing
- Vendor performance analytics visible to couples

### Guest Experience Integration
- RSVP synchronization across all vendors needing headcount
- Dietary and accessibility requirement sharing with relevant vendors
- Guest transportation coordination between venue and vendors
- Wedding day guest communication through vendor network

**EXECUTE IMMEDIATELY - Build robust couple platform backend that seamlessly connects all wedding vendors while protecting couple privacy!**