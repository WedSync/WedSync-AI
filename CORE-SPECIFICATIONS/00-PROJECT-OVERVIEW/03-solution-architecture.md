# 03-solution-architecture

`# WedSync/WedMe Solution Architecture

## System Overview

### Dual-Platform Architecture`

┌─────────────────────────────────────────────────────────┐
│                    WedSync/WedMe Ecosystem              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────┐         ┌─────────────────┐      │
│  │    WedSync      │ ◄─────► │    WedMe.app    │      │
│  │  (Suppliers)    │         │    (Couples)     │      │
│  └─────────────────┘         └─────────────────┘      │
│           ▲                           ▲                │
│           │                           │                │
│           ▼                           ▼                │
│  ┌─────────────────────────────────────────────┐      │
│  │         Shared Core Fields System            │      │
│  └─────────────────────────────────────────────┘      │
│           ▲                           ▲                │
│           │                           │                │
│  ┌─────────────────┐         ┌─────────────────┐      │
│  │   Supabase DB   │         │   AI Services    │      │
│  │   (PostgreSQL)  │         │    (OpenAI)      │      │
│  └─────────────────┘         └─────────────────┘      │
└─────────────────────────────────────────────────────────┘

`## Core Architectural Components

### 1. Core Fields System (Revolutionary Innovation)

**Concept**: Single source of truth for wedding data that auto-populates everywhere

**Implementation**:
```typescript
interface CoreFields {
  // Couple Information
  couple: {
    partner1_name: string
    partner1_email: string
    partner1_phone: string
    partner2_name: string
    partner2_email: string
    partner2_phone: string
    address: Address
  }
  
  // Wedding Details
  wedding: {
    date: Date
    ceremony_venue: Venue
    reception_venue: Venue
    guest_count: GuestCount
    style: string[]
    colors: string[]
  }
  
  // Timeline
  timeline: {
    ceremony_time: Time
    reception_time: Time
    key_moments: Moment[]
  }
  
  // Key People
  people: {
    wedding_party: Person[]
    family_vips: Person[]
    vendors: Vendor[]
  }
}`

**Data Flow**:

1. Couple enters data ONCE in WedMe
2. Data stored in central PostgreSQL database
3. Suppliers request specific fields via API
4. Auto-population happens in real-time
5. Updates propagate to all connected parties

### 2. Database Architecture

**Technology**: Supabase (PostgreSQL + Realtime + Auth)

**Key Design Decisions**:

- **Row Level Security (RLS)**: Data isolation at database level
- **Real-time Subscriptions**: Instant updates across platforms
- **JSONB Fields**: Flexible schema for vendor-specific data
- **Audit Tables**: Complete history of all changes
- **Soft Deletes**: Data recovery and compliance

**Core Tables Structure**:

sql

- `*- Simplified core structure*
suppliers (id, business_name, type, subscription_tier)
couples (id, wedding_date, core_fields_jsonb)
supplier_couple_connections (supplier_id, couple_id, status)
forms (supplier_id, structure_jsonb, core_field_mappings)
form_responses (form_id, couple_id, response_data)
customer_journeys (supplier_id, workflow_jsonb)
journey_executions (journey_id, couple_id, state)`

### 3. Authentication & Authorization

**Multi-Level Auth System**:

- **Couples**: Email/password, Google OAuth, magic links
- **Suppliers**: Email/password, Google OAuth, 2FA optional
- **Team Members**: Invitation-based, role-based permissions
- **API Access**: JWT tokens for third-party integrations

**Security Layers**:

1. Supabase Auth (battle-tested)
2. Row Level Security policies
3. API rate limiting
4. Session management
5. Audit logging

### 4. Real-Time Synchronization

**Technology**: Supabase Realtime (WebSocket-based)

**Use Cases**:

- Form responses appear instantly
- Journey progress updates live
- Collaborative editing notifications
- Activity feed updates
- Status changes propagation

**Implementation**:

typescript

`*// Example subscription*
const subscription = supabase
  .channel('couple_updates')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'core_fields',
    filter: `couple_id=eq.${coupleId}`
  }, (payload) => {
    updateLocalState(payload.new)
  })
  .subscribe()`

### 5. API Architecture

**Design Pattern**: RESTful + GraphQL hybrid

**Endpoints Structure**:

`/api/v1/
  /suppliers/
    /auth/
    /clients/
    /forms/
    /journeys/
  /couples/
    /auth/
    /core-fields/
    /suppliers/
    /tasks/
  /shared/
    /connections/
    /messages/
    /files/`

**Key Features**:

- Versioned APIs for stability
- Rate limiting per tier
- Webhook support for integrations
- Batch operations for efficiency
- GraphQL for complex queries

### 6. AI Integration Architecture

**Dual API Strategy**:

1. **Platform API** (WedSync pays): Form generation, content creation
2. **Client API** (Supplier pays): Chatbots, ongoing generation

**AI Features**:

- PDF/Image → Form conversion
- Natural language → Customer journey
- FAQ extraction from websites
- Smart field mapping
- Content personalization

### 7. Frontend Architecture

**Technology**: Next.js 15 (App Router) + TypeScript

**Key Patterns**:

- Server Components for performance
- Optimistic UI updates
- Progressive enhancement
- Offline-first capability
- Responsive design (mobile-first)

**Component Architecture**:

`/components/
  /shared/        (used by both platforms)
  /wedsync/       (supplier-specific)
  /wedme/         (couple-specific)
  /ui/            (Untitled UI + Magic UI components)`

### 8. Deployment Architecture

**Infrastructure**:

- **Frontend**: Vercel (Next.js optimized)
- **Database**: Supabase Cloud
- **File Storage**: Supabase Storage
- **CDN**: Vercel Edge Network
- **Monitoring**: Vercel Analytics + Sentry

**Environments**:

1. Development (local)
2. Preview (branch deploys)
3. Staging (pre-production)
4. Production (live)

### 9. Scalability Design

**Horizontal Scaling**:

- Stateless API servers
- Database read replicas
- CDN for static assets
- Queue-based job processing

**Performance Optimizations**:

- Database indexing strategy
- Query optimization
- Caching layers (Redis)
- Image optimization
- Code splitting

### 10. Integration Architecture

**Third-Party Services**:

- **Payment**: Stripe (subscriptions)
- **Email**: Resend/SendGrid
- **SMS**: Twilio
- **Calendar**: Google, Outlook
- **CRM Import**: HoneyBook, Dubsado
- **Maps**: Google Places API

**Webhook System**:

- Incoming webhooks for integrations
- Outgoing webhooks for events
- Retry logic with exponential backoff
- Dead letter queue for failures

## Critical Success Factors

1. **Performance**: <2 second load times
2. **Reliability**: 99.9% uptime
3. **Security**: Bank-level encryption
4. **Scalability**: Handle 10,000+ concurrent users
5. **Maintainability**: Clean, documented code

This architecture provides the foundation for a robust, scalable platform that can grow from MVP to market leader while maintaining performance and reliability.