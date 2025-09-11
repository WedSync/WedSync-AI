# WedSync/WedMe Architecture Overview

## System Design

WedSync/WedMe is a dual-application platform built on modern JAMstack architecture with real-time capabilities.

### Core Architecture Principles
- **API-First Design**: All features exposed via REST/GraphQL APIs
- **Event-Driven**: Actions trigger events that cascade through the system
- **Microservices-Ready**: Modular design allows feature isolation
- **Real-Time Sync**: WebSocket connections for instant updates
- **Mobile-First**: Progressive Web App with offline capabilities

## Application Structure

### Frontend Applications

#### WedSync (Supplier Dashboard)
- **URL**: app.wedsync.com
- **Tech**: Next.js 15.4.3 App Router
- **State**: Zustand for complex state, React Context for simple state
- **UI**: Untitled UI + Magic UI components + Tailwind CSS
- **Auth**: Supabase Auth with supplier role

#### WedMe (Couple Dashboard)
- **URL**: app.wedme.app
- **Tech**: Same Next.js codebase, different entry point
- **State**: Lighter state management, focus on read operations
- **UI**: Simplified Untitled UI components
- **Auth**: Supabase Auth with couple role

### Backend Services

#### Supabase Backend
- **Database**: PostgreSQL 15 with Row Level Security
- **Real-time**: Supabase Realtime for WebSocket connections
- **Storage**: Supabase Storage for files/images
- **Auth**: Built-in authentication with JWT tokens
- **Functions**: Edge Functions for complex operations

#### External Services
- **OpenAI API**: Form generation, content creation
- **Resend**: Transactional emails
- **Twilio**: SMS/WhatsApp (client provides API key)
- **Google Maps**: Venue autocomplete, travel times
- **Stripe**: Payment processing for subscriptions

## Data Flow Architecture

### Core Fields System Flow
Couple enters data in WedMe
↓
Stored in core_fields table
↓
Real-time broadcast to suppliers
↓
Auto-populates supplier forms
↓
Updates reflected in all connected systems

### Form Submission Flow
Client completes form
↓
Validation (Zod schema)
↓
Store in form_responses
↓
Update core_fields if applicable
↓
Trigger journey automation
↓
Send notifications

### Customer Journey Flow
Journey triggered (time/event based)
↓
Check conditions
↓
Execute module (email/SMS/form)
↓
Track completion
↓
Progress to next step
↓
Update analytics

## Security Architecture

### Authentication Layers
1. **Supabase Auth**: Primary authentication
2. **Row Level Security**: Database-level protection
3. **API Middleware**: Request validation
4. **Rate Limiting**: Prevent abuse
5. **CORS Policy**: Restrict origins

### Data Protection
- **Encryption at Rest**: All sensitive data encrypted
- **Encryption in Transit**: HTTPS/WSS only
- **PII Handling**: GDPR-compliant data management
- **Audit Logging**: All data modifications tracked

## Scalability Design

### Database Optimization
- **Indexes**: On all foreign keys and search fields
- **Partitioning**: Historical data by date
- **Connection Pooling**: Via Supabase
- **Caching**: Redis for frequently accessed data

### Performance Targets
- **Page Load**: <2 seconds (P95)
- **API Response**: <200ms (P95)
- **Real-time Sync**: <100ms latency
- **Uptime**: 99.9% availability

## Deployment Architecture

### Infrastructure
- **Frontend**: Vercel (Next.js optimized)
- **Backend**: Supabase Cloud (managed PostgreSQL)
- **CDN**: Cloudflare for static assets
- **Monitoring**: Sentry for error tracking

### Environments
1. **Development**: Local Supabase + Next.js dev
2. **Staging**: Separate Supabase project + Vercel preview
3. **Production**: Production Supabase + Vercel production

## Integration Points

### Webhook Events
- Form submissions
- Payment events
- Journey milestones
- User signups

### API Endpoints
- REST API for CRUD operations
- GraphQL for complex queries
- WebSocket for real-time updates

## Key Design Decisions

### Why Supabase?
- Built-in auth, storage, real-time
- PostgreSQL for complex queries
- Row Level Security for multi-tenancy
- Managed infrastructure

### Why Next.js App Router?
- Server Components for performance
- Built-in API routes
- Excellent TypeScript support
- Vercel deployment optimization

### Why Separate Apps vs Monolith?
- Clear separation of concerns
- Different optimization needs
- Easier to maintain
- Better security isolation

## Success Metrics

### Technical KPIs
- Response time <200ms
- Error rate <0.1%
- Uptime >99.9%
- Mobile score >90

### Business KPIs
- Viral coefficient >1.5
- Form completion rate >70%
- Supplier activation <10 mins
- Couple-supplier connection rate >30%